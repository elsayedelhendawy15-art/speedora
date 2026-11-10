const CACHE_NAME = 'speedora-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/games.html',
  '/earn.html',
  '/rewards.html',
  '/wheel.html',
  '/achievements.html',
  '/leaderboard.html',
  '/wallet.html',
  '/profile.html',
  '/auth.html',
  '/styles.css',
  '/core.js'
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// تفعيل وتنظيف الكاش القديم
self.addEventListener('activate', (e) => {
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

// استراتيجية الجلب: لو الملف في الكاش هاته، لو مش موجود هاته من النت
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('speedora-api')) return; // سيب طلبات الـ API تروح للنت مباشرة

  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    }).catch(() => {
      // لو النت فصل والملف مش موجود في الكاش
      return caches.match('/index.html');
    })
  );
});
