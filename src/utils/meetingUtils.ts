/**
 * Reusable utility to dynamically get the CURRENT website origin.
 * Automatically detects custom domains, preview domains, and production environments.
 * Never hardcodes any host or preview domain.
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/**
 * Reusable utility to generate standardized meeting codes like "abc-defg-hij"
 */
export function generateMeetingCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

/**
 * Reusable utility to generate meeting URLs dynamically using the CURRENT website origin.
 * Generates URLs like `${window.location.origin}/meeting/${meetingId}` on the fly.
 * Never hardcodes any domain, ensuring full portability across custom domains and staging environments.
 */
export function getMeetingUrl(meetingId: string): string {
  const origin = getBaseUrl();
  return origin ? `${origin}/meeting/${meetingId}` : `/meeting/${meetingId}`;
}

/**
 * Reusable utility to generate meeting join URL by code using the CURRENT website origin.
 */
export function getMeetingCodeUrl(meetingCode: string): string {
  const origin = getBaseUrl();
  return origin
    ? `${origin}/dashboard/join-meeting?code=${encodeURIComponent(meetingCode)}`
    : `/dashboard/join-meeting?code=${encodeURIComponent(meetingCode)}`;
}

/**
 * Reusable utility to normalize meeting codes or input links
 * e.g. "https://site/meeting/abc-defg-hij" -> "abc-defg-hij"
 * or "ABC-DEFG-HIJ" -> "abc-defg-hij"
 */
export function normalizeMeetingCode(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();

  // If input is a URL, extract the last path component or code query param
  if (cleaned.includes('/')) {
    try {
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        const url = new URL(cleaned);
        const codeParam = url.searchParams.get('code');
        if (codeParam) return codeParam.trim().toLowerCase();
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          return parts[parts.length - 1].trim().toLowerCase();
        }
      } else {
        const parts = cleaned.split('/').filter(Boolean);
        if (parts.length > 0) {
          cleaned = parts[parts.length - 1];
        }
      }
    } catch (e) {
      const parts = cleaned.split('/').filter(Boolean);
      if (parts.length > 0) {
        cleaned = parts[parts.length - 1];
      }
    }
  }

  return cleaned.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
}


