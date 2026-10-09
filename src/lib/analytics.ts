/** Inline boot source. Loads the first-party stats script after load + idle. */
export function deferredAnalyticsBootScript(src: string, websiteId: string): string {
  return `(() => {
  const src = ${JSON.stringify(src)};
  const websiteId = ${JSON.stringify(websiteId)};
  const inject = () => {
    if (document.querySelector('script[data-website-id="' + websiteId + '"]')) return;
    const el = document.createElement('script');
    el.defer = true;
    el.src = src;
    el.setAttribute('data-website-id', websiteId);
    document.head.appendChild(el);
  };
  const schedule = () => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(inject, { timeout: 4000 });
    else window.setTimeout(inject, 1);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();`;
}

export function analyticsScriptSrc(proxyPath: string | undefined, scriptName = 'stats'): string | null {
  const token = proxyPath?.trim();
  if (!token) return null;
  const script = scriptName.trim() || 'stats';
  return `/${token}/${script}`;
}
