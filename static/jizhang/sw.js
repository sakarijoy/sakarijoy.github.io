/* The build replaces the version placeholder alongside the HTML version. */
"use strict";

const version = "__LEDGER_VERSION__";
const cachePrefix = "riri-ledger-shell-";
const cacheName = cachePrefix + version;
const root = new URL(self.registration.scope);
const shell = new URL("./index.html", root);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const release = new URL(shell);
    release.searchParams.set("v", version);
    const response = await fetch(release, { cache: "reload" });
    if (!response.ok || !(await response.clone().text()).includes(
      '<meta name="ledger-version" content="' + version + '">'
    )) throw new Error("Ledger release is not ready");
    const cache = await caches.open(cacheName);
    await cache.put(shell, response);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(cachePrefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== root.origin || (url.pathname !== root.pathname && url.pathname !== shell.pathname)) return;
  event.respondWith((async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(event.request, { signal: controller.signal });
      if (response.ok) return response;
    } catch {
      // Use the installed release when the connection is unavailable.
    } finally {
      clearTimeout(timeout);
    }
    const cache = await caches.open(cacheName);
    return (await cache.match(shell)) ?? Response.error();
  })());
});
