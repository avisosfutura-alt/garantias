/*******************************************************************************
 * Service worker — Gestión de Garantías
 *
 * Qué hace: guarda el "cascarón" de la aplicación (HTML, manifest, iconos) para
 * que abra rápido y funcione aunque el wifi de bodega esté lento.
 *
 * Qué NO hace, a propósito: no cachea nada de la API. Las respuestas del Apps
 * Script y el login de Google siempre van a la red. Cachear datos de garantías
 * sería peor que no tener caché — mostraría información vieja como si fuera
 * la actual.
 *
 * Al publicar una versión nueva de index.html, subir el número de VERSION.
 * Eso obliga a todos los equipos a descargar el archivo nuevo.
 ******************************************************************************/

var VERSION = 'garantias-v1';

var CASCARON = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(CASCARON); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* si algo no baja, la app igual funciona en linea */ })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (llaves) {
      return Promise.all(llaves.map(function (llave) {
        if (llave !== VERSION) return caches.delete(llave);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (evento) {
  var peticion = evento.request;

  // Solo GET del propio origen. Todo lo demás (API, Google) va directo a la red.
  if (peticion.method !== 'GET') return;

  var url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/exec') !== -1) return;

  // Red primero, caché de respaldo: así siempre se ve la versión más nueva
  // cuando hay internet, y sigue abriendo cuando no lo hay.
  evento.respondWith(
    fetch(peticion)
      .then(function (respuesta) {
        var copia = respuesta.clone();
        caches.open(VERSION).then(function (cache) {
          cache.put(peticion, copia);
        }).catch(function () {});
        return respuesta;
      })
      .catch(function () {
        return caches.match(peticion).then(function (guardada) {
          return guardada || caches.match('./index.html');
        });
      })
  );
});
