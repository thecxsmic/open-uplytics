import { splashStartupImages } from "@/lib/splash";

export { splashStartupImages };

export const SEO_TITLE = "Uplitycs";
export const SEO_DESCRIPTION =
  "Self-hosted website analytics and uptime. No cookies and no profile of each visitor.";

export const SEO_KEYWORDS = [
  "Uplitycs",
  "Uplytics",
  "Uplytics Cloud",
  "uplytics cloud",
  "uplytics.space",
  "uplytics analytics",
  "website analytics",
  "cookieless analytics",
  "privacy friendly analytics",
  "website stats",
  "uptime monitoring",
  "status page",
  "lightweight analytics",
  "no cookie analytics",
  "Google Analytics alternative",
];

export function absoluteAppUrl() {
  try {
    return new URL(process.env.APP_URL || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function pageMeta({ title, description, path, absolute = false }) {
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}


