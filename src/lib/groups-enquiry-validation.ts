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
  value = value.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '');
  value = value.trim();
  // Safari AutoFill drops "+41" for same-region numbers without adding the trunk "0".
  if (/^[1-9]\d{8}$/.test(value.replace(/[\s.\-()/]/g, ''))) {
    value = `+41 ${value}`;
  }
  return value;
}

function compactGroupsEnquiryPhone(normalized: string): string {
  const withoutExtension = normalized.split(/[;,#]/)[0].replace(/\s*(?:ext|extension|x)\.?\s*\d.*$/i, '');
  return withoutExtension.replace(/[\s.\-()/]/g, '');
}

/** International (+…) or national Swiss-style (leading 0). Spaces/dashes allowed. */
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
