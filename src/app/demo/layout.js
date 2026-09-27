import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Live demo",
  description:
    "Look around a sample Uplitycs dashboard: page views, top pages, and uptime. The demo is read-only.",
  path: "/demo",
});

export default function DemoLayout({ children }) {
  return children;
}
