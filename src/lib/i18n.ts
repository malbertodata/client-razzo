import type { FonduePageConfig } from '@/lib/campaign';
import { campaign, isKnownPage, pageConfig } from '@/lib/campaign';
import contentEn from '@/config/content.en.json';

export type Locale = 'de' | 'en';

export type UiCopy = {
  langLabel: string;
  reserveNav: string;
  bookingTypeNav: string;
  bookNow: string;
  bookChalet: string;
  bookRestaurant: string;
  back: string;
  widgetTitle: string;
  metaNav: string;
  contactNav: string;
  contactCall: string;
  contactEmail: string;
  contactInstagram: string;
  impressum: string;
  agb: string;
  privacy: string;
  chaletSeasonNote: string;
  bookingGroupsEnquiryLabel: string;
  bookingGroupsEnquiryNav: string;
  bookingGroupsEnquirySubject: string;
  bookingGroupsEnquiryBody: string;
  bookingGroupsModalIntro: string;
  bookingGroupsModalTo: string;
  bookingGroupsModalSubject: string;
  bookingGroupsModalFields: string;
  bookingGroupsModalOpen: string;
  bookingGroupsModalCancel: string;
  bookingDetailsToggle: string;
  chaletHoursAria: string;
  chaletHoursLine1: string;
  chaletHoursLine2: string;
  chaletHoursLine3: string;
  chaletHoursLine4: string;
  restaurantHoursAria: string;
  restaurantHoursLine1: string;
  restaurantHoursLine2: string;
  restaurantHoursLine3: string;
  restaurantMenuNote: string;
};

export type LegalUrls = {
  privacyUrl: string;
  impressumUrl: string;
  agbUrl: string;
};

const uiDe: UiCopy = {
  langLabel: 'Sprache',
  reserveNav: 'Reservieren',
  bookingTypeNav: 'Buchungsart',
  bookNow: 'Jetzt reservieren',
  bookChalet: 'Fondue Chalet',
  bookRestaurant: 'Restaurant',
  back: 'Zurück',
  widgetTitle: 'Restaurant reservieren',
  metaNav: 'Meta Navigation',
  contactNav: 'Kontakt',
  contactCall: 'Anrufen:',
  contactEmail: 'E-Mail:',
  contactInstagram: 'Instagram',
  impressum: 'Impressum',
  agb: 'AGB',
  privacy: 'Datenschutz',
  chaletSeasonNote: 'Nur von November bis Januar',
  bookingGroupsEnquiryLabel: 'Gruppen ab 9 Personen',
  bookingGroupsEnquiryNav: 'Gruppenanfrage per E-Mail',
  bookingGroupsEnquirySubject: 'Reservierungsanfrage',
  bookingGroupsModalIntro: 'Deine E-Mail-App öffnet sich mit einer Vorlage zum Ausfüllen.',
  bookingGroupsModalTo: 'An',
  bookingGroupsModalSubject: 'Betreff',
  bookingGroupsModalFields: 'Bitte ergänzen:',
  bookingGroupsModalOpen: 'E-Mail öffnen',
  bookingGroupsModalCancel: 'Abbrechen',
  bookingGroupsEnquiryBody: `Datum: 

Uhrzeit: 

Gruppengrösse: 

Fondue Chalet oder Restaurant: 

Name: 

Telefonnummer: 

`,
  bookingDetailsToggle: 'Öffnungszeiten & Details',
  chaletHoursAria: 'Öffnungszeiten Fondue Chalet',
  chaletHoursLine1: 'Di – Fr | 11.30 – 14 Uhr',
  chaletHoursLine2: 'Di – Fr | 17.30 – 22 Uhr',
  chaletHoursLine3: 'Sa | 11.00 – 22.00',
  chaletHoursLine4: 'So Geschlossen',
  restaurantHoursAria: 'Öffnungszeiten Restaurant',
  restaurantHoursLine1: 'Mo – Mi | 9 – 22 Uhr',
  restaurantHoursLine2: 'Do – Sa | 9 – 23 Uhr',
  restaurantHoursLine3: 'So Geschlossen',
  restaurantMenuNote: 'À la carte — kein Fondue im Restaurant',
};

const legalDe: LegalUrls = {
  privacyUrl: campaign.privacyUrl?.trim() || 'https://www.razzo.sg/datenschutz/',
  impressumUrl: 'https://www.razzo.sg/impressum/',
  agbUrl: 'https://www.razzo.sg/agb/',
};

export function htmlLang(locale: Locale): string {
  return locale === 'en' ? 'en' : 'de-CH';
}

/** Aleno reservation widget `locale` query value (see aleno widget docs). */
export function alenoWidgetLocale(locale: Locale): 'de' | 'en' {
  return locale === 'en' ? 'en' : 'de';
}

export function localePrefix(locale: Locale): string {
  return locale === 'en' ? '/en' : '';
}

export function bookingSlug(locale: Locale): string {
  if (locale === 'en') {
    return campaign.bookingPathEn?.trim() || 'book';
  }
  return campaign.bookingPath;
}

/** Internal page id in `campaign.pages` (public DE slug may differ, e.g. `reservieren`). */
function bookingPageId(): string {
  return campaign.defaultLandingPath.trim().toLowerCase();
}

/** Public URL segment for a page (internal id stays e.g. `buchen`). */
export function publicPageSlug(locale: Locale, internalPageId: string): string {
  const id = internalPageId.trim().toLowerCase();
  if (id === bookingPageId()) {
    return bookingSlug(locale);
  }
  return id;
}

export function resolveInternalPageId(locale: Locale, publicSlug: string): string | null {
  const slug = publicSlug.trim().toLowerCase();
  if (slug === bookingSlug(locale).toLowerCase()) {
    return bookingPageId();
  }
  if (isKnownPage(slug)) return slug;
  return null;
}

export function pagePath(locale: Locale, internalPageId: string): string {
  const slug = publicPageSlug(locale, internalPageId);
  return `${localePrefix(locale)}/${slug}`;
}

export function switchLocalePath(input: {
  locale: Locale;
  pageId: string;
  search: URLSearchParams;
}): string {
  const target: Locale = input.locale === 'de' ? 'en' : 'de';
  const base = pagePath(target, input.pageId);
  const params = new URLSearchParams(input.search);
  params.delete('locale');
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function uiCopy(locale: Locale): UiCopy {
  return locale === 'en' ? contentEn.ui : uiDe;
}

export function groupsEnquiryFieldLabels(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith(':'));
}

export function groupsEnquiryMailtoHref(input: { email: string; locale: Locale }): string {
  const email = input.email.trim();
  const ui = uiCopy(input.locale);
  // encodeURIComponent (%20), not URLSearchParams (+) — many mail clients leave + literal in the body.
  const subject = encodeURIComponent(ui.bookingGroupsEnquirySubject);
  const body = encodeURIComponent(ui.bookingGroupsEnquiryBody);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function legalUrls(locale: Locale): LegalUrls {
  return locale === 'en' ? contentEn.legal : legalDe;
}

export function localizedPage(locale: Locale, pageId: string): FonduePageConfig | null {
  const base = pageConfig(pageId);
  if (!base) return null;
  if (locale === 'de') return base;

  const en = contentEn.pages[pageId as keyof typeof contentEn.pages];
  if (!en) return base;

  return {
    ...base,
    title: en.title,
    headline: en.headline,
    intro: en.intro,
  };
}
