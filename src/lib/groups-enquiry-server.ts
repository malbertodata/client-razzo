import {
  groupsEnquiryBookableTimes,
  groupsEnquiryChaletDateBounds,
  groupsEnquiryIsValidDate,
  groupsEnquiryRestaurantDateBounds,
  defaultChaletLastAvailableDate,
} from '@/lib/aleno';
import { campaign } from '@/lib/campaign';
import {
  formatGroupsEnquiryMailBodies,
  formatGroupsEnquiryMailSubject,
  uiCopy,
  type GroupsEnquiryFormValues,
  type GroupsEnquiryVenue,
  type Locale,
} from '@/lib/i18n';
import {
  isValidGroupsEnquiryEmail,
  isValidGroupsEnquiryPhone,
} from '@/lib/groups-enquiry-validation';
import {
  formatGroupsEnquiryUtmChannelLabel,
  normalizeGroupsEnquiryUtmInput,
  type GroupsEnquiryUtmAttribution,
} from '@/lib/utm';

const GROUP_SIZE_MIN = 9;
const GROUP_SIZE_MAX = 80;
const CHALET_DATE_MAX_FALLBACK = '2027-01-30';

export type GroupsEnquiryApiError =
  | 'invalid_json'
  | 'invalid_payload'
  | 'invalid_date'
  | 'invalid_time'
  | 'invalid_group_size'
  | 'invalid_email'
  | 'invalid_phone'
  | 'missing_fields'
  | 'send_failed'
  | 'not_configured';

export type GroupsEnquiryRequest = GroupsEnquiryFormValues & { locale: Locale };

function chaletDateBounds() {
  const first = campaign.chaletFirstAvailableDate?.trim() || '2026-11-03';
  const last =
    campaign.chaletLastAvailableDate?.trim() ||
    defaultChaletLastAvailableDate(first) ||
    CHALET_DATE_MAX_FALLBACK;
  return groupsEnquiryChaletDateBounds(first, last);
}

function dateBoundsForVenue(venue: GroupsEnquiryVenue) {
  return venue === 'restaurant'
    ? groupsEnquiryRestaurantDateBounds(new Date())
    : chaletDateBounds();
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateGroupsEnquiryPayload(raw: unknown):
  | { ok: true; values: GroupsEnquiryRequest }
  | { ok: false; error: GroupsEnquiryApiError } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'invalid_payload' };
  }

  const record = raw as Record<string, unknown>;
  const locale: Locale = record.locale === 'en' ? 'en' : 'de';
  const venue = record.venue;
  if (venue !== 'chalet' && venue !== 'restaurant') {
    return { ok: false, error: 'invalid_payload' };
  }

  const date = asTrimmedString(record.date);
  const time = asTrimmedString(record.time);
  const groupSizeRaw = asTrimmedString(record.groupSize);
  const name = asTrimmedString(record.name);
  const email = asTrimmedString(record.email);
  const phone = asTrimmedString(record.phone);
  const notes = asTrimmedString(record.notes);

  if (!date || !time || !groupSizeRaw || !name || !email || !phone) {
    return { ok: false, error: 'missing_fields' };
  }

  if (!isValidGroupsEnquiryEmail(email)) {
    return { ok: false, error: 'invalid_email' };
  }

  if (!isValidGroupsEnquiryPhone(phone)) {
    return { ok: false, error: 'invalid_phone' };
  }

  const groupSize = Number(groupSizeRaw);
  if (
    !Number.isFinite(groupSize) ||
    groupSize < GROUP_SIZE_MIN ||
    groupSize > GROUP_SIZE_MAX ||
    !Number.isInteger(groupSize)
  ) {
    return { ok: false, error: 'invalid_group_size' };
  }

  const bounds = dateBoundsForVenue(venue);
  if (!groupsEnquiryIsValidDate(date, venue, bounds)) {
    return { ok: false, error: 'invalid_date' };
  }

  const allowedTimes = groupsEnquiryBookableTimes(date, venue);
  if (!allowedTimes.includes(time)) {
    return { ok: false, error: 'invalid_time' };
  }

  const utm = normalizeGroupsEnquiryUtmInput(record.utm);

  return {
    ok: true,
    values: {
      locale,
      venue,
      date,
      time,
      groupSize: String(groupSize),
      name,
      email,
      phone,
      notes,
      utm,
    },
  };
}

function groupsEnquiryEmailIntroLine(utm: GroupsEnquiryUtmAttribution): string {
  const ui = uiCopy('de');
  const channel = formatGroupsEnquiryUtmChannelLabel(utm);
  if (!channel) {
    return ui.bookingGroupsEnquiryEmailIntro;
  }
  return ui.bookingGroupsEnquiryEmailIntroVia.replace('{channel}', channel);
}

async function sendViaResend(values: GroupsEnquiryRequest): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY missing');
  }

  const fromAddress =
    process.env.GROUPS_ENQUIRY_FROM?.trim() ||
    campaign.groupsEnquiryEmail?.trim() ||
    'ciao@razzosg.ch';
  const toAddress = process.env.GROUPS_ENQUIRY_TO?.trim() || 'markusalbert@me.com';

  const intro = groupsEnquiryEmailIntroLine(values.utm ?? normalizeGroupsEnquiryUtmInput(null));
  const { text, html } = formatGroupsEnquiryMailBodies('de', values, intro);
  const subject = formatGroupsEnquiryMailSubject('de', values);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Razzo <${fromAddress}>`,
      to: [toAddress],
      reply_to: values.email,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('Resend API error', res.status, detail);
    throw new Error(`Resend ${res.status}`);
  }
}

export async function handleGroupsEnquiryPost(bodyText: string): Promise<{
  status: number;
  json: { ok: boolean; error?: GroupsEnquiryApiError };
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { status: 400, json: { ok: false, error: 'invalid_json' } };
  }

  const validated = validateGroupsEnquiryPayload(parsed);
  if (!validated.ok) {
    return { status: 400, json: { ok: false, error: validated.error } };
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return { status: 503, json: { ok: false, error: 'not_configured' } };
  }

  try {
    await sendViaResend(validated.values);
    return { status: 200, json: { ok: true } };
  } catch {
    return { status: 502, json: { ok: false, error: 'send_failed' } };
  }
}
