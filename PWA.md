# Installing Arata Odds

Open the running app and choose **Install app**. Browsers that support an install prompt offer a standalone window. Other browsers show instructions for their installation menu; Safari uses Share → Add to Home Screen. Installation does not place bets or create an account.

The manifest supplies 192/512-pixel app icons, a maskable icon and standalone display. Updates show **Update app** before activating a waiting service worker. Existing research tickets stay in the backend database.

In a production build served with the backend on the same origin, the service worker caches the application HTML and its compiled assets for offline opening. In the current development server, it deliberately avoids caching development/HMR files and shows a dedicated offline screen. API responses, live scores, bookmaker odds, forecasts and tickets are never served from service-worker cache. Live information requires a connection; the offline banner explains that limitation.

Localhost is suitable for desktop PWA testing. Phone installation needs an accessible HTTPS deployment, which has not been published in this release. The current local backend listens on loopback. A deployment must preserve the API routing and a private access boundary because this personal app has no multi-user authentication.

Reference: [MDN installability requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
