/** Must include a domain with a dot (e.g. name@example.ch). */
export const GROUPS_ENQUIRY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidGroupsEnquiryEmail(email: string): boolean {
  return GROUPS_ENQUIRY_EMAIL_RE.test(email.trim());
}

const GROUPS_ENQUIRY_PHONE_CHARS_RE = /^[\d\s+\-()./#;xX,]+$/;

/** Strip invisible/formatting chars and tel: URIs from autofill or paste. */
export function normalizeGroupsEnquiryPhone(raw: string): string {
  let value = raw.trim().replace(/^tel:/i, '');
  value = value.replace(/[\uFF0B]/g, '+');
  value = value.replace(/[\u2010-\u2015\u2212]/g, '-');
  value = value.replace(/[\u00A0\u202F\u2009]/g, ' ');
  value = value.replace(/[\u200B-\u200F\u2060\u2066-\u2069\uFEFF\u202A-\u202E]/g, '');
  value = value.trim();
  if (value.startsWith('00')) value = `+${value.slice(2).trimStart()}`;
  return value;
}

export const GROUPS_ENQUIRY_PHONE_COUNTRIES = [
  { iso: 'CH', flag: '🇨🇭', code: '+41' },
  { iso: 'DE', flag: '🇩🇪', code: '+49' },
  { iso: 'AT', flag: '🇦🇹', code: '+43' },
  { iso: 'LI', flag: '🇱🇮', code: '+423' },
  { iso: 'IT', flag: '🇮🇹', code: '+39' },
  { iso: 'FR', flag: '🇫🇷', code: '+33' },
  { iso: 'NL', flag: '🇳🇱', code: '+31' },
  { iso: 'BE', flag: '🇧🇪', code: '+32' },
  { iso: 'LU', flag: '🇱🇺', code: '+352' },
  { iso: 'ES', flag: '🇪🇸', code: '+34' },
  { iso: 'PT', flag: '🇵🇹', code: '+351' },
  { iso: 'GB', flag: '🇬🇧', code: '+44' },
  { iso: 'IE', flag: '🇮🇪', code: '+353' },
  { iso: 'DK', flag: '🇩🇰', code: '+45' },
  { iso: 'SE', flag: '🇸🇪', code: '+46' },
  { iso: 'NO', flag: '🇳🇴', code: '+47' },
  { iso: 'FI', flag: '🇫🇮', code: '+358' },
  { iso: 'PL', flag: '🇵🇱', code: '+48' },
  { iso: 'CZ', flag: '🇨🇿', code: '+420' },
  { iso: 'HU', flag: '🇭🇺', code: '+36' },
  { iso: 'HR', flag: '🇭🇷', code: '+385' },
  { iso: 'GR', flag: '🇬🇷', code: '+30' },
  { iso: 'TR', flag: '🇹🇷', code: '+90' },
  { iso: 'US', flag: '🇺🇸', code: '+1' },
  { iso: 'AU', flag: '🇦🇺', code: '+61' },
  { iso: 'NZ', flag: '🇳🇿', code: '+64' },
  { iso: 'AE', flag: '🇦🇪', code: '+971' },
  { iso: 'IL', flag: '🇮🇱', code: '+972' },
  { iso: 'IN', flag: '🇮🇳', code: '+91' },
  { iso: 'CN', flag: '🇨🇳', code: '+86' },
  { iso: 'JP', flag: '🇯🇵', code: '+81' },
  { iso: 'BR', flag: '🇧🇷', code: '+55' },
  { iso: 'ZA', flag: '🇿🇦', code: '+27' },
] as const;

export const GROUPS_ENQUIRY_DEFAULT_PHONE_CODE = '+41';

/** Longest listed country code that prefixes an international number, e.g. "+49 151…" → "+49". */
export function matchGroupsEnquiryPhoneCode(normalized: string): string | null {
  if (!normalized.startsWith('+')) return null;
  const digits = `+${normalized.slice(1).replace(/\D/g, '')}`;
  let match: string | null = null;
  for (const { code } of GROUPS_ENQUIRY_PHONE_COUNTRIES) {
    if (digits.startsWith(code) && (!match || code.length > match.length)) match = code;
  }
  return match;
}

/** Strip a known country code so the remainder can sit next to the code picker. */
export function splitGroupsEnquiryPhone(raw: string): { code: string; national: string } | null {
  const normalized = normalizeGroupsEnquiryPhone(raw);
  const code = matchGroupsEnquiryPhoneCode(normalized);
  if (!code) return null;
  let rest = normalized.slice(1);
  for (const digit of code.slice(1)) {
    rest = rest.replace(/^\D*/, '');
    if (rest[0] !== digit) return null;
    rest = rest.slice(1);
  }
  return { code, national: rest.replace(/^[\s.\-/)]+/, '').trim() };
}

/** Full number from picker code + field; an explicit "+…" in the field wins. */
export function composeGroupsEnquiryPhone(code: string, raw: string): string {
  const normalized = normalizeGroupsEnquiryPhone(raw);
  if (!normalized || normalized.startsWith('+')) return normalized;
  // Italian numbers keep their leading 0 after the country code.
  const national = code === '+39' ? normalized : normalized.replace(/^0+/, '');
  return `${code} ${national}`;
}

function compactGroupsEnquiryPhone(normalized: string): string {
  const withoutExtension = normalized.split(/[;,#]/)[0].replace(/\s*(?:ext|extension|x)\.?\s*\d.*$/i, '');
  return withoutExtension.replace(/[\s.\-()/]/g, '');
}

/** International (+…) or national with leading 0. Spaces/dashes allowed. */
export function isValidGroupsEnquiryPhone(phone: string): boolean {
  const normalized = normalizeGroupsEnquiryPhone(phone);
  if (!normalized || !GROUPS_ENQUIRY_PHONE_CHARS_RE.test(normalized)) return false;

  const compact = compactGroupsEnquiryPhone(normalized);
  if (compact.startsWith('+')) {
    const digits = compact.slice(1);
    return /^\d{7,15}$/.test(digits);
  }
  if (compact.startsWith('0')) {
    return /^0\d{8,11}$/.test(compact);
  }
  return false;
}
