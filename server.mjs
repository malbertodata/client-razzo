import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, 'dist');
const port = Number(process.env.PORT || 3000);

const token = process.env.ANALYTICS_PROXY_PATH?.trim() || '';
const websiteId = process.env.UMAMI_WEBSITE_ID?.trim() || '';
const umamiOrigin = (process.env.UMAMI_UPSTREAM_URL || 'https://analytics.clientpodium.com').replace(
  /\/$/,
  '',
);
const scriptName = (process.env.ANALYTICS_SCRIPT_NAME || 'stats').trim() || 'stats';

const serve = sirv(dist, { dev: false, single: false });

function classifyAnalyticsProxy(pathname, method) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === '_stats') return { kind: 'deny' };
  if (!token || parts[0] !== token) return { kind: 'miss' };
  const rest = parts.slice(1).join('/');
  const verb = method.toUpperCase();
  if (rest === scriptName && (verb === 'GET' || verb === 'HEAD')) {
    return { kind: 'allow', upstreamPath: `/${scriptName}`, method: verb };
  }
  if ((rest === 'api/collect' || rest === 'api/send') && verb === 'POST') {
    return { kind: 'allow', upstreamPath: `/${rest}`, method: 'POST' };
  }
  return { kind: 'deny' };
}

function pinWebsiteId(bodyText) {
  if (!websiteId) return bodyText;
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return bodyText;
  const record = parsed;
  const payload = record.payload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    payload.website = websiteId;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || 'website' in record) {
    record.website = websiteId;
  }
  return JSON.stringify(record);
}

async function proxyAnalytics(request, upstreamPath) {
  const incoming = new URL(request.url, `http://127.0.0.1:${port}`);
  const target = new URL(`${umamiOrigin}${upstreamPath}`);
  target.search = incoming.search;

  const headers = new Headers();
  const accept = request.headers.get('accept');
  if (accept) headers.set('accept', accept);
  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) headers.set('x-forwarded-for', forwarded);

  let body;
  if (request.method === 'POST') {
    const raw = await request.text();
    body = pinWebsiteId(raw);
    headers.set('content-type', request.headers.get('content-type') || 'application/json');
  }

  const res = await fetch(target, { method: request.method, headers, body });
  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const decision = classifyAnalyticsProxy(url.pathname, req.method || 'GET');

    if (decision.kind === 'allow') {
      const proxied = await proxyAnalytics(req, decision.upstreamPath);
      res.writeHead(proxied.status, Object.fromEntries(proxied.headers));
      if (proxied.body) {
        const buf = Buffer.from(await proxied.arrayBuffer());
        res.end(buf);
      } else {
        res.end();
      }
      return;
    }
    if (decision.kind === 'deny') {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (url.pathname === '/' || url.pathname === '') {
      res.writeHead(302, { Location: '/reservieren/' });
      res.end();
      return;
    }

    await new Promise((resolve, reject) => {
      serve(req, res, () => {
        res.writeHead(404);
        res.end('Not Found');
        resolve();
      });
    });
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}).listen(port, () => {
  console.log(`Razzo landings listening on http://127.0.0.1:${port}`);
});
