import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname === "/",
      handler: new NetworkFirst({
        cacheName: "base-url",
        matchOptions: {
          ignoreSearch: true, // Specifically ignores search params for this route
        },
      }),
    },
  ],
  precacheOptions: {
     ignoreURLParametersMatching: [/.*/],
  },
});

serwist.registerCapture(({ request, sameOrigin }) => {
  return sameOrigin;// && request.destination === "image";
}, new NetworkFirst());

serwist.registerCapture(({ request, sameOrigin }) => {
  return !sameOrigin;
}, new NetworkOnly());

serwist.addEventListeners();
