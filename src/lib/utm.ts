import type { CampaignConfig, FondueUtm } from '@/lib/campaign';
import { bookingSlug, localePrefix, type Locale } from '@/lib/i18n';

export function buildFondueUtmSearchParams(input: {
  config: CampaignConfig;
  pageUtm: FondueUtm;
  incomingSearch: URLSearchParams;
}): URLSearchParams {
  const params = new URLSearchParams(input.incomingSearch);
  params.delete('locale');

  const setIfAbsent = (key: string, value: string | undefined) => {
    const v = value?.trim().toLowerCase();
    if (!v || params.has(key)) return;
    params.set(key, v);
  };

  setIfAbsent('utm_campaign', input.config.campaign.name);
  setIfAbsent('utm_source', input.pageUtm.source);
  setIfAbsent('utm_medium', input.pageUtm.medium);
  setIfAbsent('utm_content', input.pageUtm.content);

  return params;
}

export function fondueBookingHref(input: {
  config: CampaignConfig;
  fromPageUtm: FondueUtm;
  incomingSearch: URLSearchParams;
  locale?: Locale;
}): string {
  const params = buildFondueUtmSearchParams({
    config: input.config,
    pageUtm: input.fromPageUtm,
    incomingSearch: input.incomingSearch,
  });
  const q = params.toString();
  const locale = input.locale ?? 'de';
  const prefix = localePrefix(locale);
  const path = `${prefix}/${bookingSlug(locale)}`;
  return q ? `${path}?${q}` : path;
}
