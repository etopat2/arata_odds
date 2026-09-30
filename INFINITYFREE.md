# InfinityFree compatibility

The source archive contains the complete Arata Odds app, migrations and setup instructions. It is **not** a fully functioning InfinityFree upload. InfinityFree's free hosting supports PHP/MySQL sites, while this app's backend runs as a Node.js process or a Cloudflare-compatible Worker and stores hosted data in D1. InfinityFree free hosting also does not provide cron jobs or long-running workers for unattended daily ticket generation. Uploading only the React build would show the page but leave authentication, fixtures, live results, tickets, model learning and daily generation without a working API.

Deploy the full archive on a Node.js host with persistent storage, or deploy the compiled Worker and D1 migrations on a Cloudflare-compatible platform with cron support. The local Node setup is in [SETUP.md](SETUP.md); the hosted Worker setup and schedule are in [DEPLOYMENT.md](DEPLOYMENT.md). Keep the database and secret admin bootstrap password outside public files. Do not upload `.local-data`, `.sites-runtime`, `.env`, credentials or test databases.

If InfinityFree is mandatory, the backend would require a separate PHP/MySQL implementation plus an external scheduler. That implementation is not part of this archive, and PHP/MySQL alone would still lack the currently required scheduled and live background work.

References: [InfinityFree hosting features](https://www.infinityfree.com/), [InfinityFree support on Node.js apps](https://forum.infinityfree.com/t/hosting-express-app/76540), and [InfinityFree support on scheduled scripts](https://forum.infinityfree.com/t/how-to-schedule-scripts/107119).
