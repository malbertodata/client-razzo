import type { FonduePageConfig } from '@/lib/campaign';
import { campaign, isKnownPage, pageConfig } from '@/lib/campaign';
import type { GroupsEnquiryUtmAttribution } from '@/lib/utm';
import contentEn from '@/config/content.en.json';

export type Locale = 'de' | 'en';

export type UiCopy = {
  langLabel: string;
  reserveNav: string;
  bookingTypeNav: string;
  bookNow: string;
  bookingHeadlineLine1: string;
  bookingHeadlineLine2: string;
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
  bookingGroupsEnquiryButtonLabel: string;
  bookingGroupsEnquiryButtonHint: string;
  bookingGroupsEnquiryModalTitle: string;
  bookingGroupsEnquiryNav: string;
  bookingGroupsEnquirySubjectPrefix: string;
  bookingGroupsEnquirySubjectPeopleUnit: string;
  bookingGroupsEnquiryEmailIntro: string;
  bookingGroupsEnquiryEmailIntroVia: string;
  bookingGroupsEnquiryEmailDetailsHeading: string;
  bookingGroupsEnquiryEmailContactHeading: string;
  bookingGroupsFormDate: string;
  bookingGroupsFormDateClosed: string;
  bookingGroupsFormDateChaletClosed: string;
  bookingGroupsFormDateChange: string;
  bookingGroupsFormTime: string;
  bookingGroupsFormTimeChange: string;
  bookingGroupsFormTimePlaceholder: string;
  bookingGroupsFormTimeClosed: string;
  bookingGroupsFormTimeWindowLunch: string;
  bookingGroupsFormTimeWindowDinner: string;
  bookingGroupsFormTimeWindowChaletName: string;
  bookingGroupsFormTimeWindowRestaurantName: string;
  bookingGroupsFormVenue: string;
  bookingGroupsFormGroupSize: string;
  bookingGroupsFormGroupSizeChoose: string;
  bookingGroupsFormName: string;
  bookingGroupsFormEmail: string;
  bookingGroupsFormEmailInvalid: string;
  bookingGroupsFormPhoneInvalid: string;
  bookingGroupsFormPhone: string;
  bookingGroupsFormNotes: string;
  bookingGroupsFormContinue: string;
  bookingGroupsFormBack: string;
  bookingGroupsFormSubmit: string;
  bookingGroupsFormSubmitSending: string;
  bookingGroupsFormSubmitSuccess: string;
  bookingGroupsFormSubmitSuccessInstagram: string;
  bookingGroupsFormSubmitError: string;
  bookingGroupsModalClose: string;
  bookingGroupsModalCancelMessage: string;
  bookingGroupsModalCancelConfirm: string;
  bookingGroupsModalCancelDismiss: string;
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
  bookingHeadlineLine1: 'Jetzt',
  bookingHeadlineLine2: 'reservieren',
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
  bookingGroupsEnquiryButtonLabel: 'Gruppenbuchung',
  bookingGroupsEnquiryButtonHint: 'ab 9 Personen',
  bookingGroupsEnquiryModalTitle: 'Buchungsanfrage',
  bookingGroupsEnquiryNav: 'Gruppenanfrage per E-Mail',
  bookingGroupsEnquirySubjectPrefix: 'Gruppenanfrage',
  bookingGroupsEnquirySubjectPeopleUnit: 'Personen',
  bookingGroupsEnquiryEmailIntro: 'Folgende Reservierungsanfrage ist eingetroffen:',
  bookingGroupsEnquiryEmailIntroVia:
    'Folgende Reservierungsanfrage ist über {channel} eingetroffen:',
  bookingGroupsEnquiryEmailDetailsHeading: 'DETAILS',
  bookingGroupsEnquiryEmailContactHeading: 'KONTAKT',
  bookingGroupsFormDate: 'Datum:',
  bookingGroupsFormDateClosed: 'An diesem Tag ist für diese Buchungsart nicht geöffnet.',
  bookingGroupsFormDateChaletClosed:
    'Montag und Sonntag ist das Fondue Chalet geschlossen (siehe Öffnungszeiten).',
  bookingGroupsFormDateChange: 'Datum ändern',
  bookingGroupsFormTime: 'Uhrzeit:',
  bookingGroupsFormTimeChange: 'Uhrzeit ändern',
  bookingGroupsFormTimePlaceholder: 'Bitte wählen',
  bookingGroupsFormTimeClosed: 'An diesem Tag keine Reservierungszeiten',
  bookingGroupsFormTimeWindowLunch: '11.30 – 14 Uhr',
  bookingGroupsFormTimeWindowDinner: '17.30 – 20.30 Uhr',
  bookingGroupsFormTimeWindowChaletName: 'Chalet razzo',
  bookingGroupsFormTimeWindowRestaurantName: 'Restaurant razzo',
  bookingGroupsFormVenue: 'Buchungsart:',
  bookingGroupsFormGroupSize: 'Gruppengrösse:',
  bookingGroupsFormGroupSizeChoose: 'Bitte wählen',
  bookingGroupsFormName: 'Name:',
  bookingGroupsFormEmail: 'E-Mail:',
  bookingGroupsFormEmailInvalid:
    'Bitte eine gültige E-Mail-Adresse eingeben (z. B. name@beispiel.ch).',
  bookingGroupsFormPhoneInvalid:
    'Bitte eine gültige Telefonnummer eingeben (z. B. 079 … oder +41 …).',
  bookingGroupsFormPhone: 'Telefon:',
  bookingGroupsFormNotes: 'Anmerkungen:',
  bookingGroupsFormContinue: 'Weiter',
  bookingGroupsFormBack: 'Zurück',
  bookingGroupsFormSubmit: 'Anfrage senden',
  bookingGroupsFormSubmitSending: 'Wird gesendet …',
  bookingGroupsFormSubmitSuccess:
    'Vielen Dank für Ihre Anfrage.\nWir melden uns innert eines Werktages.',
  bookingGroupsFormSubmitSuccessInstagram: 'Auf Instagram folgen',
  bookingGroupsFormSubmitError:
    'Senden fehlgeschlagen. Bitte später erneut versuchen oder uns direkt per E-Mail kontaktieren.',
  bookingGroupsModalClose: 'Schliessen',
  bookingGroupsModalCancelMessage:
    'Möchten Sie die Anfrage abbrechen?\nIhre Eingaben gehen verloren.',
  bookingGroupsModalCancelConfirm: 'Anfrage abbrechen',
  bookingGroupsModalCancelDismiss: 'Anfrage fortsetzen',
  bookingDetailsToggle: 'Öffnungszeiten & Details',
  chaletHoursAria: 'Öffnungszeiten Fondue Chalet',
  chaletHoursLine1: 'Di – Fr | 11.30 – 14 Uhr',
  chaletHoursLine2: 'Di – Fr | 17.30 – 22 Uhr',
  chaletHoursLine3: 'Sa | 11.00 – 22.00',
  chaletHoursLine4: 'Mo & So geschlossen',
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

export type GroupsEnquiryVenue = 'chalet' | 'restaurant';

export type GroupsEnquiryFormValues = {
  date: string;
  time: string;
  venue: GroupsEnquiryVenue;
  groupSize: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  utm?: GroupsEnquiryUtmAttribution;
};

export function groupsEnquiryVenueLabel(locale: Locale, venue: GroupsEnquiryVenue): string {
  const ui = uiCopy(locale);
  return venue === 'restaurant' ? ui.bookRestaurant : ui.bookChalet;
}

const GROUPS_ENQUIRY_MAIL_RULE = '________________________________';

function groupsEnquiryFieldLabel(uiLabel: string): string {
  return uiLabel.replace(/:\s*$/, '').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatGroupsEnquiryMailBodies(
  locale: Locale,
  values: GroupsEnquiryFormValues,
  introLine?: string,
): { text: string; html: string } {
  const ui = uiCopy(locale);
  const intro = introLine?.trim() || ui.bookingGroupsEnquiryEmailIntro;
  const venueLabel = groupsEnquiryVenueLabel(locale, values.venue);
  const notesDisplay = values.notes.trim() || '—';

  const detailLines = [
    `${groupsEnquiryFieldLabel(ui.bookingGroupsFormVenue)}: ${venueLabel}`,
    `${groupsEnquiryFieldLabel(ui.bookingGroupsFormDate)}: ${values.date}`,
    `${groupsEnquiryFieldLabel(ui.bookingGroupsFormTime)}: ${values.time}`,
    `${groupsEnquiryFieldLabel(ui.bookingGroupsFormGroupSize)}: ${values.groupSize}`,
    `${groupsEnquiryFieldLabel(ui.bookingGroupsFormNotes)}: ${notesDisplay}`,
  ];

  const contactLines = [
    `${groupsEnquiryFieldLabel(ui.bookingGroupsFormName)}: ${values.name}`,
    `${groupsEnquiryFieldLabel(ui.bookingGroupsFormEmail)}: ${values.email}`,
    `${groupsEnquiryFieldLabel(ui.bookingGroupsFormPhone)}: ${values.phone}`,
  ];

  const text = [
    intro,
    '',
    ui.bookingGroupsEnquiryEmailContactHeading,
    ...contactLines,
    GROUPS_ENQUIRY_MAIL_RULE,
    '',
    ui.bookingGroupsEnquiryEmailDetailsHeading,
    ...detailLines,
  ].join('\n');

  const htmlDetail = detailLines.map((line) => escapeHtml(line)).join('<br>\n');
  const htmlContact = contactLines.map((line) => escapeHtml(line)).join('<br>\n');

  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    `<p><b>${escapeHtml(ui.bookingGroupsEnquiryEmailContactHeading)}</b><br>`,
    htmlContact,
    `</p>`,
    `<p>${GROUPS_ENQUIRY_MAIL_RULE}</p>`,
    `<p><b>${escapeHtml(ui.bookingGroupsEnquiryEmailDetailsHeading)}</b><br>`,
    htmlDetail,
    `</p>`,
  ].join('\n');

  return { text, html };
}

export function formatGroupsEnquiryMailBody(locale: Locale, values: GroupsEnquiryFormValues): string {
  return formatGroupsEnquiryMailBodies(locale, values).text;
}

export function formatGroupsEnquiryMailSubject(
  locale: Locale,
  values: GroupsEnquiryFormValues,
): string {
  const ui = uiCopy(locale);
  return `${ui.bookingGroupsEnquirySubjectPrefix} | ${values.date} | ${values.time} | ${values.groupSize} ${ui.bookingGroupsEnquirySubjectPeopleUnit}`;
}

export function groupsEnquiryMailtoFromForm(input: {
  email: string;
  locale: Locale;
  values: GroupsEnquiryFormValues;
}): string {
  const email = input.email.trim();
  const subject = encodeURIComponent(formatGroupsEnquiryMailSubject('de', input.values));
  const body = encodeURIComponent(formatGroupsEnquiryMailBody('de', input.values));
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
