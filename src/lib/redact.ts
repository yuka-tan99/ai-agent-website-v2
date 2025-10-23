const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX =
  /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
const CREDIT_CARD_REGEX =
  /\b(?:\d[ -]*?){13,16}\b/g;

export function redactPII(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(EMAIL_REGEX, "[redacted-email]")
    .replace(PHONE_REGEX, "[redacted-phone]")
    .replace(CREDIT_CARD_REGEX, "[redacted-number]");
}
