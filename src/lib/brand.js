export const BRAND_NAME = "Uplitycs";

export function appOrigin() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function trackerSnippet(siteId) {
  return `<script defer data-site="${siteId}" src="${appOrigin()}/uplitycs.js"></script>`;
}

export const BRAND_FROM = process.env.RESEND_FROM || "Uplitycs <noreply@localhost>";
