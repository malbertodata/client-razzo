/** First-party Umami proxy (production server + astro dev). */

import { BlockList, isIP } from 'node:net';

/** Checked 2026-10-19 against https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6. Ranges unchanged since 2026-09-26. */
const CLOUDFLARE_IPV4 = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

const CLOUDFLARE_IPV6 = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

/** Cloudflare's ray is 16 hex chars, a hyphen, and a 3-letter colo, e.g. abcdef0123456789-SYD. */
const CLOUDFLARE_RAY = /^[0-9a-f]{16}-[a-z]{3}$/i;

function addCidrs(list, cidrs, family) {
  for (const cidr of cidrs) {
    const [address, prefix] = cidr.split('/');
    if (!address || !prefix) continue;
    list.addSubnet(address, Number(prefix), family);
  }
}

const cloudflareNets = new BlockList();
addCidrs(cloudflareNets, CLOUDFLARE_IPV4, 'ipv4');
addCidrs(cloudflareNets, CLOUDFLARE_IPV6, 'ipv6');

const nonPublicNets = new BlockList();
nonPublicNets.addSubnet('10.0.0.0', 8, 'ipv4');
nonPublicNets.addSubnet('172.16.0.0', 12, 'ipv4');
nonPublicNets.addSubnet('192.168.0.0', 16, 'ipv4');
nonPublicNets.addSubnet('127.0.0.0', 8, 'ipv4');
nonPublicNets.addSubnet('::1', 128, 'ipv6');
nonPublicNets.addSubnet('fe80::', 10, 'ipv6');
nonPublicNets.addSubnet('fc00::', 7, 'ipv6');

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

export function pinWebsiteId(bodyText, websiteId) {
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
    delete payload.ip;
  }
  delete record.ip;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || 'website' in record) {
    record.website = websiteId;
  }
  return JSON.stringify(record);
}

function header(req, name) {
  return headerValue(req.headers, name);
}

function headerValue(headers, name) {
  if (!headers) return undefined;
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function validIp(value) {
  return Boolean(value && isIP(value) !== 0);
}

function isCloudflareIp(address) {
  const family = isIP(address);
  if (family === 0) return false;
  return cloudflareNets.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

/** Docker bridge, loopback, and IPv6 link-local or unique-local. Not a visitor. */
function isNonPublicIp(address) {
  const family = isIP(address);
  if (family === 4) return nonPublicNets.check(address, 'ipv4');
  if (family !== 6) return false;
  const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1] && isIP(mapped[1]) === 4) return isNonPublicIp(mapped[1]);
  return nonPublicNets.check(address, 'ipv6');
}

function forwardedHops(headers) {
  const forwarded = headerValue(headers, 'x-forwarded-for');
  if (!forwarded) return [];
  return forwarded.split(',').map((part) => part.trim()).filter(Boolean);
}

function rightmostPublicHop(hops) {
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    const hop = hops[index];
    if (hop && validIp(hop) && !isNonPublicIp(hop)) return hop;
  }
  return null;
}

function connectingIp(headers) {
  const value = headerValue(headers, 'cf-connecting-ip')?.trim();
  if (!validIp(value) || isNonPublicIp(value)) return null;
  return value;
}

function cloudflareRay(headers) {
  const ray = headerValue(headers, 'cf-ray')?.trim();
  return Boolean(ray && CLOUDFLARE_RAY.test(ray));
}

/**
 * True when the visitor headers may be forwarded to Umami.
 * A public Cloudflare hop is proof. With only a private hop, Traefik is the Docker peer
 * and a well-formed CF-Ray plus a public CF-Connecting-IP is the fallback.
 */
export function analyticsRequestViaCloudflare(headers) {
  const publicHop = rightmostPublicHop(forwardedHops(headers));
  if (publicHop) return isCloudflareIp(publicHop);
  return Boolean(connectingIp(headers) && cloudflareRay(headers));
}

/**
 * One public visitor address for Umami.
 * Private hops are the platform proxy and are skipped. The rightmost public hop is what Traefik saw.
 */
export function clientAddressForAnalytics(headers) {
  const hops = forwardedHops(headers);
  const publicHop = rightmostPublicHop(hops);
  if (publicHop && isCloudflareIp(publicHop)) {
    const connecting = connectingIp(headers);
    if (connecting) return connecting;
    const index = hops.lastIndexOf(publicHop);
    const previous = index > 0 ? hops[index - 1] : null;
    if (validIp(previous) && !isCloudflareIp(previous) && !isNonPublicIp(previous)) return previous;
    return null;
  }
  if (publicHop) return publicHop;
  if (connectingIp(headers) && cloudflareRay(headers)) return connectingIp(headers);
  return null;
}

/** Headers this proxy may send upstream. Location headers only on a proven Cloudflare POST. */
export function analyticsUpstreamHeaders(incomingHeaders, method) {
  const out = {};
  const clientIp = clientAddressForAnalytics(incomingHeaders);
  if (clientIp) out['x-forwarded-for'] = clientIp;

  const verb = (method || 'GET').toUpperCase();
  if (verb === 'GET' || verb === 'HEAD') return out;
  if (!analyticsRequestViaCloudflare(incomingHeaders)) return out;

  const country = headerValue(incomingHeaders, 'cf-ipcountry')?.trim().toUpperCase();
  if (country && /^[A-Z]{2}$/.test(country)) out['cf-ipcountry'] = country;

  const region = headerValue(incomingHeaders, 'cf-region-code')?.trim();
  if (region && /^[A-Za-z0-9]{1,8}$/.test(region)) out['cf-region-code'] = region;

  const city = headerValue(incomingHeaders, 'cf-ipcity')?.trim();
  if (city && city.length <= 80 && !/[\u0000-\u001f\u007f]/.test(city)) out['cf-ipcity'] = city;

  return out;
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

  const method = (req.method || 'GET').toUpperCase();
  const headers = new Headers();
  const accept = header(req, 'accept');
  if (accept) headers.set('accept', accept);
  const userAgent = header(req, 'user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  for (const [name, value] of Object.entries(analyticsUpstreamHeaders(req.headers, method))) {
    headers.set(name, value);
  }
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
