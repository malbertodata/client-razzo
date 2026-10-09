import { applyChaletBookingSlotToUrl, applyRestaurantBookingSlotToUrl } from '@/lib/aleno';

const overlay = document.getElementById('fondue-widget-overlay');
const closeBtn = document.getElementById('fondue-widget-close');
const iframe = document.getElementById('fondue-aleno-widget') as HTMLIFrameElement | null;
const openButtons = document.querySelectorAll<HTMLElement>('[data-fondue-show-widget]');

function freshWidgetSrc(base: string): string {
  const url = new URL(base);
  url.searchParams.set('_', String(Date.now()));
  return url.toString();
}

function widgetSrcForOpen(base: string, linkId: string | null, trigger: HTMLElement | null): string {
  const trimmed = base.trim();
  if (!trimmed) return '';

  let withSlot = trimmed;
  if (linkId === 'restaurant') {
    withSlot = applyRestaurantBookingSlotToUrl(trimmed, new Date());
  } else if (linkId === 'chalet') {
    const first = trigger?.getAttribute('data-chalet-season-first')?.trim() || '2026-11-03';
    const last = trigger?.getAttribute('data-chalet-season-last')?.trim() || undefined;
    withSlot = applyChaletBookingSlotToUrl(trimmed, new Date(), first, last);
  }

  return freshWidgetSrc(withSlot);
}

function resetWidgetIframe(): void {
  iframe?.removeAttribute('src');
}

function openWidget(widgetBaseSrc: string, linkId: string | null, trigger: HTMLElement | null): void {
  if (!overlay || !iframe) return;
  const src = widgetSrcForOpen(widgetBaseSrc, linkId, trigger);
  if (!src) return;
  iframe.src = src;
  overlay.hidden = false;
  document.body.classList.add('fondue-widget-open');
}

function closeWidget(): void {
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove('fondue-widget-open');
  resetWidgetIframe();
}

openButtons.forEach((openBtn) => {
  openBtn.addEventListener('click', () => {
    const src = openBtn.getAttribute('data-widget-src')?.trim();
    const linkId = openBtn.getAttribute('data-fondue-link');
    openWidget(src ?? '', linkId, openBtn);
  });
});

closeBtn?.addEventListener('click', closeWidget);

const params = new URLSearchParams(window.location.search);
if (iframe?.getAttribute('src')?.trim()) {
  document.body.classList.add('fondue-widget-open');
  overlay && (overlay.hidden = false);
} else if (params.has('restaurant')) {
  const restaurantBtn = document.querySelector<HTMLElement>(
    '[data-fondue-show-widget][data-fondue-link="restaurant"]',
  );
  const src = restaurantBtn?.getAttribute('data-widget-src')?.trim();
  if (src) openWidget(src, 'restaurant', restaurantBtn);
} else if (params.has('chalet')) {
  const chaletBtn = document.querySelector<HTMLElement>(
    '[data-fondue-show-widget][data-fondue-link="chalet"]',
  );
  const src = chaletBtn?.getAttribute('data-widget-src')?.trim();
  if (src) openWidget(src, 'chalet', chaletBtn);
}
