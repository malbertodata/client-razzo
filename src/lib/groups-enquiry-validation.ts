/** Must include a domain with a dot (e.g. name@example.ch). */
export const GROUPS_ENQUIRY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidGroupsEnquiryEmail(email: string): boolean {
  return GROUPS_ENQUIRY_EMAIL_RE.test(email.trim());
}

const GROUPS_ENQUIRY_PHONE_CHARS_RE = /^[\d\s+\-()./]+$/;

/** International (+…) or national Swiss-style (leading 0). Spaces/dashes allowed. */
export function isValidGroupsEnquiryPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed || !GROUPS_ENQUIRY_PHONE_CHARS_RE.test(trimmed)) return false;

  const compact = trimmed.replace(/[\s.\-()/]/g, '');
  if (compact.startsWith('+')) {
    const digits = compact.slice(1);
    return /^\d{8,15}$/.test(digits);
  }
  if (compact.startsWith('0')) {
    return /^0\d{8,11}$/.test(compact);
  }
  return false;
}
