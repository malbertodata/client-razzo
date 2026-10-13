const CAMPAIGN = 'fondue+chalet+2026';

/** @type {Record<string, string>} pathname (no trailing slash) → path + fixed query */
export const SHORT_LINK_REDIRECTS = {
  '/': '/reservieren',
  '/buchen': '/reservieren',
  '/en': '/en/book',
  '/fondue-chalet': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet`,
  '/firmenfeier': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=firmenfeier`,
  '/vereinsfeier': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=vereinsfeier`,
  '/praxisfeier': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=praxisfeier`,
  '/lehrstuhlfeier': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=lehrstuhlfeier`,
  '/institutsfeier': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=institutsfeier`,
  '/en/fondue-chalet': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet`,
  '/en/firmenfeier': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=firmenfeier`,
  '/en/vereinsfeier': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=vereinsfeier`,
  '/en/praxisfeier': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=praxisfeier`,
  '/en/lehrstuhlfeier': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=lehrstuhlfeier`,
  '/en/institutsfeier': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=institutsfeier`,
  '/chalet-aussen': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet`,
  '/unternehmen': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=firmenfeier`,
  '/vereine': `/reservieren?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=vereinsfeier`,
  '/en/chalet-aussen': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet`,
  '/en/unternehmen': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=firmenfeier`,
  '/en/vereine': `/en/book?utm_campaign=${CAMPAIGN}&utm_source=letter&utm_medium=letter&utm_content=vereinsfeier`,
};

/** @param {string} pathname */
export function normalizeShortLinkPath(pathname) {
  if (!pathname || pathname === '/') return '/';
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Merge incoming query onto redirect target. Fixed redirect params win on key conflicts.
 * @param {string} targetPathAndQuery e.g. `/reservieren?utm_campaign=…`
 * @param {URLSearchParams} incoming
 */
export function mergeShortLinkRedirectTarget(targetPathAndQuery, incoming) {
  const qIndex = targetPathAndQuery.indexOf('?');
  const path = qIndex === -1 ? targetPathAndQuery : targetPathAndQuery.slice(0, qIndex);
  const targetQuery =
    qIndex === -1 ? new URLSearchParams() : new URLSearchParams(targetPathAndQuery.slice(qIndex + 1));

  const merged = new URLSearchParams(targetQuery);
  for (const [key, value] of incoming.entries()) {
    if (!merged.has(key)) merged.set(key, value);
  }

  const qs = merged.toString();
  const withSlash = path.endsWith('/') ? path : `${path}/`;
  return qs ? `${withSlash}?${qs}` : withSlash;
}

/**
 * @param {string} pathname
 * @param {URLSearchParams} incoming
 * @returns {string | null} Location header value (relative)
 */
export function shortLinkRedirectLocation(pathname, incoming) {
  const key = normalizeShortLinkPath(pathname);
  const target = SHORT_LINK_REDIRECTS[key];
  if (!target) return null;
  return mergeShortLinkRedirectTarget(target, incoming);
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {string} pathname
 * @param {URLSearchParams} incoming
 * @returns {boolean} true if response was sent
 */
export function tryWriteShortLinkRedirect(res, pathname, incoming) {
  const location = shortLinkRedirectLocation(pathname, incoming);
  if (!location) return false;
  res.writeHead(302, { Location: location });
  res.end();
  return true;
}

/** Astro `redirects` config (paths without trailing slash). */
export function astroRedirectsConfig() {
  return { ...SHORT_LINK_REDIRECTS };
}
