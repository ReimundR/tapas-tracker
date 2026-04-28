/*
 * Copyright (c) 2025-2026 Tapas Tracker
 *
 * This file is part of Tapas Tracker.
 *
 * Tapas Tracker is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Tapas Tracker is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Tapas Tracker.  If not, see <https://www.gnu.org/licenses/agpl-3.0.html>.
 */

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { StaleWhileRevalidate, NetworkFirst, NetworkOnly, Serwist } from "serwist";

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
  navigationPreload: false,//true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname === "/",
      handler: new NetworkFirst({
        cacheName: "base-url",
        matchOptions: {
          ignoreSearch: true, // Specifically ignores search params for this route
        },
        networkTimeoutSeconds: 3,
      }),
    },
  ],
  precacheOptions: {
     ignoreURLParametersMatching: [/.*/],
  },
});

serwist.registerCapture(({ request, sameOrigin, url }) => {
  return sameOrigin && url.pathname !== "/";
}, new StaleWhileRevalidate());

serwist.registerCapture(({ request, sameOrigin }) => {
  return !sameOrigin;
}, new NetworkOnly());

serwist.addEventListeners();
