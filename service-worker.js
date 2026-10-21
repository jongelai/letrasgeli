const CACHE_NAME = "letrasgeli-v1";

// Archivos esenciales para guardar en caché
const ASSETS = [
  "./",
  "./index.html",
  "./script.js",
  "./letras.css",
  "./icons/192.png",
  "./icons/512.png"
];

// Instalación: Guardar archivos en caché
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés antiguas si las hubiera
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones (Network First con respaldo en Caché)
self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request)
      .catch(() => caches.match(e.request))
  );
});