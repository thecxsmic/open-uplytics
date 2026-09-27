import { absoluteAppUrl } from "@/lib/seo";

export default function robots() {
  const origin = absoluteAppUrl().origin;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/d", "/dashboard", "/api/", "/account", "/sign-in", "/sign-up"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
