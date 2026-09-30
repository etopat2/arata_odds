# Installing Arata Odds

Open the running HTTPS app. When the browser considers it installable, use its native address-bar install icon or browser menu; the app does not place a manual install button in its content. On iPhone/iPad use Safari Share → Add to Home Screen. Browser eligibility and UI vary by browser. Installation does not place bets or bypass sign-in.

The manifest supplies 192/512-pixel app icons, a maskable icon and standalone display. Updates show **Update app** before activating a waiting service worker. Existing research tickets stay in the backend database.

In a production build served with the backend on the same origin, the service worker caches the application HTML and its compiled assets for offline opening. In the current development server, it deliberately avoids caching development/HMR files and shows a dedicated offline screen. API responses, live scores, bookmaker odds, forecasts and tickets are never served from service-worker cache. Live information requires a connection; the offline banner explains that limitation.

Localhost is suitable for desktop PWA testing. Phone installation requires an accessible HTTPS deployment. The deployed URL must serve the manifest, icons, service worker and authenticated API on the same origin. An offline shell does not contain account data, live scores or tickets; sign-in and those data require a connection.

Reference: [MDN installability requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
