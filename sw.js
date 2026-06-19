"use strict";
/* 감사 길잡이 — 서비스워커(웹/PWA 전용 · P4).
   전략: index.html=network-first(오프라인 시 캐시) · 그 외 same-origin GET=stale-while-revalidate
   (캐시 즉시 응답 + 백그라운드 갱신 → 버전 범프 없이도 한 번 방문하면 다음 방문에 최신).
   데스크톱(Electron·file://)에서는 등록 자체가 안 되므로 무영향. */
const CACHE = "hsgiljabi-cache-v0.1.9";
const PRECACHE = [
  "./", "index.html", "styles.css",
  "cards_data.js", "norm_dict.js", "related.js",
  "kogl.js", "onboarding.js", "digest.js", "dashboard.js", "graphView.js", "analysisTutorial.js", "panelGuide.js", "followAlong.js", "tour.js", "memo.js", "app.js", "browser-shim.js",
  "favicon.svg", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.allSettled(PRECACHE.map(u => c.add(u)))   // 일부 404(환경별 파일 부재)에도 나머지 캐시 — addAll 전체 실패 방지
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 외부(법제처 등)는 관여하지 않음
  const isShell = req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
  if (isShell) {
    e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(cached => {
    const net = fetch(req).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }).catch(() => cached);
    return cached || net;
  }));
});
