/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pg", "pg-connection-string"],
  async redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: false },
      { source: "/signup", destination: "/sign-up", permanent: false },
      { source: "/verify-email", destination: "/sign-in", permanent: false },
      { source: "/dashboard", destination: "/d", permanent: false },
      { source: "/dashboard/:path*", destination: "/d/:path*", permanent: false },
    ];
  },
  async rewrites() {
    return [
      // Keep collect relocatable: serve the same handler under a short path.
      { source: "/u/collect", destination: "/api/collect" },
    ];
  },
  async headers() {
    return [
      {
        source: "/uplitycs.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
