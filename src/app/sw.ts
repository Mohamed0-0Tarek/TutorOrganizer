import { NetworkOnly, Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

interface SwScope {
  __SW_MANIFEST?: Array<{ url: string; revision: string | null }>;
}

const scope = self as unknown as SwScope;

const serwist = new Serwist({
  precacheEntries: scope.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        /googleapis|gstatic|firebase|identitytoolkit/.test(url.hostname),
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});

serwist.addEventListeners();
