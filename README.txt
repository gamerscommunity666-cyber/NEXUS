NEXUS PWA STARTER FILES

Included:
- manifest.json
- service-worker.js
- icons/nexus-192.png
- icons/nexus-512.png
- icons/nexus-maskable-512.png
- register-service-worker.js (copy its snippet into your existing index.html)

INSTALL:
1. Back up your current working NEXUS deployment.
2. Upload manifest.json, service-worker.js, and the icons/ folder beside index.html.
3. Add inside the existing <head>:
   <link rel="manifest" href="./manifest.json">
   <meta name="theme-color" content="#11132b">
4. Copy the snippet from register-service-worker.js into the existing index.html before </body>.
5. Test on a separate Git branch or Vercel preview deployment first.
6. Open the HTTPS preview in Android Chrome and use its menu's Install app/Add to Home screen option if offered.

LIMITATIONS:
This starter caches the HTML shell and icons. If the game loads Three.js or other libraries from a CDN, those dependencies may still require internet. Add verified local game assets to the cache list only after confirming their exact paths. Do not cache API POST requests.

These files do NOT fix the Echo Spire story transition. We still need to inspect the current game index.html to diagnose that.
