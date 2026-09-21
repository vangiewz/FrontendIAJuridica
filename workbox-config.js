module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,js,css,png,jpg,svg,ttf,woff,woff2,json}'],
  globIgnores: ['sw.js', 'workbox-*.js'],
  swDest: 'dist/sw.js',
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/api\//],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: false,
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
};
