const CACHE_NAME = "placeholder-brand-v1";
const CORE_ASSETS = [
  "/manifest.webmanifest",
  "/logo-still.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];
const RESTRICTED_PATH = /^\/(?:portal|advisor|admin|studio|api|auth)(?:\/|$)/i;
const IMAGE_PATH = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i;
const HASHED_ASSET_PATH =
  /-[a-z0-9_-]{6,}\.(?:css|js|mjs|otf|ttf|woff2?)$/i;

function isSupabaseRequest(url) {
  return /(^|\.)supabase\.(?:co|in)$/i.test(url.hostname) ||
    url.hostname.includes(".supabase.");
}

function isRestrictedRequest(request, url) {
  return url.origin !== self.location.origin ||
    RESTRICTED_PATH.test(url.pathname) ||
    isSupabaseRequest(url) ||
    request.headers.has("authorization");
}

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") &&
    HASHED_ASSET_PATH.test(url.pathname)
  ) || IMAGE_PATH.test(url.pathname);
}

function isSafeStaticResponse(request, response) {
  const cacheControl = response.headers.get("cache-control") || "";
  return response.status === 200 &&
    response.type === "basic" &&
    !request.headers.has("authorization") &&
    !response.headers.has("set-cookie") &&
    !/\b(?:private|no-store)\b/i.test(cacheControl);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const offlineResponse = await fetch("/offline", { cache: "reload" });
    if (!offlineResponse.ok) throw new Error("Offline page precache failed.");
    await cache.put("/offline", offlineResponse.clone());
    const offlineHtml = await offlineResponse.text();
    const nextAssets = Array.from(
      offlineHtml.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g),
      (match) => new URL(match[1], self.location.origin).href,
    );
    const assets = [...new Set([...CORE_ASSETS, ...nextAssets])];
    await Promise.all(assets.map(async (asset) => {
      try {
        const url = new URL(asset, self.location.origin);
        const request = new Request(url.href);
        if (isRestrictedRequest(request, url)) return;
        const response = await fetch(request);
        if (isSafeStaticResponse(request, response)) {
          await cache.put(request, response);
        }
      } catch {
        return;
      }
    }));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("placeholder-brand-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.match("/offline")) ||
          new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  if (isRestrictedRequest(request, url)) return;
  if (!isCacheableAsset(url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    const response = await fetch(request);
    if (isSafeStaticResponse(request, response)) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
