const DEFAULT_MAIN_SITE = 'https://www.razzo.sg';

const KEEP404_PREFIXES = ['/_astro/', '/brand/', '/.well-known/'];

const ASSET_EXT = /\.(js|mjs|cjs|css|map|woff2?|ttf|eot|svg|ico|png|jpe?g|gif|webp|avif|json|txt|xml|webmanifest)$/i;

/** @param {string | undefined} raw */
export function mainSiteOrigin(raw = process.env.MAIN_SITE_ORIGIN) {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return DEFAULT_MAIN_SITE;
  return trimmed.replace(/\/+$/, '');
}

/** Homepage URL used for catch-all redirects (trailing slash). */
export function mainSiteHomeLocation(origin = mainSiteOrigin()) {
  return `${origin}/`;
}

/**
 * When sirv misses a file, keep 404 instead of redirecting to the main site.
 * @param {string} pathname
 * @param {{ analyticsToken?: string }} [options]
 */
export function shouldKeep404(pathname, options = {}) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (KEEP404_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  const token = options.analyticsToken?.trim();
  if (token) {
    const tokenPrefix = `/${token}/`;
    if (path === `/${token}` || path.startsWith(tokenPrefix)) {
      return true;
    }
  }

  const segment = path.split('/').pop() ?? '';
  if (segment && ASSET_EXT.test(segment)) {
    return true;
  }

  return false;
}
