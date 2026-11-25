import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The app is a fully client-side authenticated PWA (Firestore + Auth on the
  // client), so route-level prerendering/caching is intentionally disabled.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Turbopack dev doesn't support the plugin; the production build uses webpack.
  disable: process.env.NODE_ENV !== "production",
});

export default withSerwist(nextConfig);
