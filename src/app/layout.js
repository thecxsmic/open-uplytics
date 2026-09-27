import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { startScheduler } from "@/lib/scheduler";
import {
  absoluteAppUrl,
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  splashStartupImages,
} from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: absoluteAppUrl(),
  title: {
    default: SEO_TITLE,
    template: "%s · Uplitycs",
  },
  description: SEO_DESCRIPTION,
  applicationName: "Uplitycs",
  keywords: SEO_KEYWORDS,
  authors: [{ name: "Uplitycs" }],
  creator: "Uplitycs",
  publisher: "Uplitycs",
  category: "technology",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Uplitycs",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "Uplitycs",
    statusBarStyle: "black",
    startupImage: splashStartupImages().map(({ url, media }) => ({ url, media })),
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/icons/mask.svg", color: "#ffffff" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#000000",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default function RootLayout({ children }) {
  startScheduler();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-clip bg-black font-sans text-zinc-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
