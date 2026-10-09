import raw from '@/config/campaign.json';

export type FondueUtm = {
  source?: string;
  medium?: string;
  content?: string;
};

export type FondueLandingPage = {
  kind: 'landing';
  title: string;
  headline: string;
  intro: string;
  utm: FondueUtm;
};

export type FondueBookingPage = {
  kind: 'booking';
  title: string;
  headline: string;
  intro: string;
  utm: FondueUtm;
};

export type FonduePageConfig = FondueLandingPage | FondueBookingPage;

export type CampaignConfig = {
  siteName: string;
  publicHosts: string[];
  privacyUrl?: string;
  campaign: {
    name: string;
    mediumQr: string;
    mediumLetter: string;
  };
  alenoAssets: {
    scriptSrc: string;
    styleHref: string;
  };
  restaurantWidgetUrl: string;
  chaletBookingUrl: string;
  /** ISO date (yyyy-mm-dd): chalet season opens (widget slots from this day). */
  chaletFirstAvailableDate?: string;
  /** ISO date (yyyy-mm-dd): last day of chalet season (default: Jan 31 after season year). */
  chaletLastAvailableDate?: string;
  groupsEnquiryEmail?: string;
  pages: Record<string, FonduePageConfig>;
  bookingPath: string;
  bookingPathEn?: string;
  defaultLandingPath: string;
};

export const campaign = raw as CampaignConfig;

export function isKnownPage(pageId: string): boolean {
  const id = pageId.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(campaign.pages, id);
}

export function pageConfig(pageId: string): FonduePageConfig | null {
  const id = pageId.trim().toLowerCase();
  return campaign.pages[id] ?? null;
}

export function allPageIds(): string[] {
  return Object.keys(campaign.pages);
}
