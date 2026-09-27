const COUNTRY = /^[A-Z]{2}$/;

/** ISO country from the edge, when the host sends one. Never an IP. */
export function countryFromHeaders(headers) {
  const raw =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("cloudfront-viewer-country");
  if (!raw) return "";
  const code = raw.trim().toUpperCase();
  if (!COUNTRY.test(code) || code === "XX" || code === "T1") return "";
  return code;
}
