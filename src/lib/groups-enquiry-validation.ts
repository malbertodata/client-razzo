/** Must include a domain with a dot (e.g. name@example.ch). */
export const GROUPS_ENQUIRY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidGroupsEnquiryEmail(email: string): boolean {
  return GROUPS_ENQUIRY_EMAIL_RE.test(email.trim());
}
