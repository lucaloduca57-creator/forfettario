/* Service worker del Calcolatore Forfettario.
   Salva una copia della pagina, dell'icona e del font sul telefono,
   così l'app si apre anche senza connessione.
   - Pagina: prima prova internet (così gli aggiornamenti arrivano subito),
     se non c'è rete usa la copia salvata.
   - Font e icona: usa la copia salvata e la aggiorna in sottofondo. */

const CACHE = "forfettario-v1";
const CORE = ["./", "./index.html", "./apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pagina: rete prima, copia salvata se offline
  if (req.mode === "navigate" || (url.origin === location.origin && url.pathname.endsWith(".html"))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Font di Google e file dell'app: copia salvata subito, aggiornata in sottofondo
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (isFont || url.origin === location.origin) {
    event.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});