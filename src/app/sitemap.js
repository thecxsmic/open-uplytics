import { absoluteAppUrl } from "@/lib/seo";

const PAGES = [
  ["/sign-in", "monthly", 0.4],
  ["/sign-up", "monthly", 0.4],
  ["/demo", "monthly", 0.5],
];

export default function sitemap() {
  const origin = absoluteAppUrl().origin;
  return PAGES.map(([path, changeFrequency, priority]) => ({
    url: `${origin}${path}`,
    lastModified: new Date("2026-09-27"),
    changeFrequency,
    priority,
  }));
}
