// Minimal service worker: exists so the browser will offer "Add to Home Screen"
// and treat this as an installable PWA. Deliberately does not cache dynamic
// dashboard/workout data — training numbers must always be fresh.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  self.clients.claim()
})

self.addEventListener('fetch', () => {
  // Network-first passthrough. No offline cache in the MVP.
})
