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

export type GroupsEnquiryUtmAttribution = {
  source: string;
  medium: string;
  content: string;
  campaign: string;
};

const EMPTY_UTM: GroupsEnquiryUtmAttribution = {
  source: '',
  medium: '',
  content: '',
  campaign: '',
};

export function parseGroupsEnquiryUtm(params: URLSearchParams): GroupsEnquiryUtmAttribution {
  const read = (key: string) => params.get(key)?.trim().replace(/\+/g, ' ') ?? '';
  return {
    source: read('utm_source'),
    medium: read('utm_medium'),
    content: read('utm_content'),
    campaign: read('utm_campaign'),
  };
}

export function hasGroupsEnquiryUtm(utm: GroupsEnquiryUtmAttribution): boolean {
  return Boolean(utm.source || utm.medium || utm.content || utm.campaign);
}

/** German inbox label for the intro line («… über XYZ eingetroffen»). Only known `utm_content` values. */
export function formatGroupsEnquiryUtmChannelLabel(utm: GroupsEnquiryUtmAttribution): string | null {
  const contentKey = utm.content.toLowerCase();
  const byContent: Record<string, string> = {
    firmenfeier: 'Firmenfeier (Brief)',
    vereinsfeier: 'Vereinsfeier (Brief)',
    praxisfeier: 'Praxisfeier (Brief)',
    lehrstuhlfeier: 'Lehrstuhlfeier (Brief)',
    institutsfeier: 'Institutsfeier (Brief)',
    'fondue chalet': 'Fondue-Chalet-Poster (QR)',
  };
  return byContent[contentKey] ?? null;
}

export function normalizeGroupsEnquiryUtmInput(raw: unknown): GroupsEnquiryUtmAttribution {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_UTM };
  const record = raw as Record<string, unknown>;
  const clip = (value: unknown, max = 120) =>
    typeof value === 'string' ? value.trim().replace(/\+/g, ' ').slice(0, max) : '';
  return {
    source: clip(record.source),
    medium: clip(record.medium),
    content: clip(record.content),
    campaign: clip(record.campaign),
  };
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
