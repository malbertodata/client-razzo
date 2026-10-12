/** First-party Umami proxy (production server + astro dev). */

function trimEnv(name) {
  return process.env[name]?.trim() || '';
}

export function analyticsProxyConfig() {
  const token =
    trimEnv('ANALYTICS_PROXY_PATH') || trimEnv('PUBLIC_ANALYTICS_PROXY_PATH');
  const websiteId = trimEnv('UMAMI_WEBSITE_ID') || trimEnv('PUBLIC_UMAMI_WEBSITE_ID');
  const umamiOrigin = (
    process.env.UMAMI_UPSTREAM_URL || 'https://analytics.clientpodium.com'
  ).replace(/\/+$/, '');
  const scriptName = (process.env.ANALYTICS_SCRIPT_NAME || 'stats').trim() || 'stats';
  return { token, websiteId, umamiOrigin, scriptName };
}

/**
 * @param {string} pathname
 * @param {string} method
 * @param {{ token: string, scriptName: string }} config
 */
export function classifyAnalyticsProxy(pathname, method, config) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === '_stats') return { kind: 'deny' };
  if (!config.token || parts[0] !== config.token) return { kind: 'miss' };
  const rest = parts.slice(1).join('/');
  const verb = method.toUpperCase();
  if (rest === config.scriptName && (verb === 'GET' || verb === 'HEAD')) {
    return { kind: 'allow', upstreamPath: `/${config.scriptName}`, method: verb };
  }
  if ((rest === 'api/collect' || rest === 'api/send') && verb === 'POST') {
    return { kind: 'allow', upstreamPath: `/${rest}`, method: 'POST' };
  }
  return { kind: 'deny' };
}

function pinWebsiteId(bodyText, websiteId) {
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

function header(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const HOP_BY_HOP_RESPONSE = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function outboundAnalyticsHeaders(upstreamHeaders, { bodyByteLength, isHead }) {
  const out = {};
  for (const [key, value] of upstreamHeaders) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_RESPONSE.has(lower)) continue;
    if (lower === 'content-encoding') continue;
    if (lower === 'content-length') continue;
    if (lower === 'transfer-encoding') continue;
    out[key] = value;
  }
  if (!isHead) {
    out['content-length'] = String(bodyByteLength);
  }
  return out;
}

async function proxyAnalytics(req, upstreamPath, config) {
  const host = header(req, 'host') || '127.0.0.1';
  const incoming = new URL(req.url || '/', `http://${host}`);
  const target = new URL(`${config.umamiOrigin}${upstreamPath}`);
  target.search = incoming.search;

  const headers = new Headers();
  const accept = header(req, 'accept');
  if (accept) headers.set('accept', accept);
  const userAgent = header(req, 'user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  const forwarded = header(req, 'x-forwarded-for');
  if (forwarded) headers.set('x-forwarded-for', forwarded);

  const method = (req.method || 'GET').toUpperCase();
  let body;
  if (method === 'POST') {
    const raw = await readRequestBody(req);
    body = pinWebsiteId(raw, config.websiteId);
    headers.set('content-type', header(req, 'content-type') || 'application/json');
  }

  const res = await fetch(target, { method, headers, body });
  let responseBody = Buffer.alloc(0);
  if (method !== 'HEAD') {
    responseBody = Buffer.from(await res.arrayBuffer());
  }
  return { status: res.status, headers: res.headers, method, responseBody };
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<'allow' | 'deny' | 'miss'>}
 */
export async function tryHandleAnalyticsProxy(req, res) {
  const config = analyticsProxyConfig();
  if (!config.token) return 'miss';

  const host = header(req, 'host') || '127.0.0.1';
  const url = new URL(req.url || '/', `http://${host}`);
  const decision = classifyAnalyticsProxy(url.pathname, req.method || 'GET', config);

  if (decision.kind === 'miss') return 'miss';

  if (decision.kind === 'deny') {
    res.writeHead(403);
    res.end('Forbidden');
    return 'deny';
  }

  const proxied = await proxyAnalytics(req, decision.upstreamPath, config);
  const isHead = proxied.method === 'HEAD';
  if (isHead) {
    res.writeHead(
      proxied.status,
      outboundAnalyticsHeaders(proxied.headers, { bodyByteLength: 0, isHead: true }),
    );
    res.end();
    return 'allow';
  }
  res.writeHead(
    proxied.status,
    outboundAnalyticsHeaders(proxied.headers, {
      bodyByteLength: proxied.responseBody.length,
      isHead: false,
    }),
  );
  res.end(proxied.responseBody);
  return 'allow';
}
