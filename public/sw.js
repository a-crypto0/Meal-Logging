const CACHE = "meal-app-v1";
const SHELL = ["/", "/log", "/analysis", "/history", "/recommend"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET, Supabase, Anthropic, and API routes
  if (
    e.request.method !== "GET" ||
    url.host.includes("supabase.co") ||
    url.host.includes("anthropic.com") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Cache-first for versioned static assets
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ??
          fetch(e.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Network-first for navigation — fall back to cached shell
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/").then((r) => r ?? Response.error()))
    );
    return;
  }
});
