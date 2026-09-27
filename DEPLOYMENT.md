# Deployment

The complete hosted app uses a Cloudflare-compatible ESM Worker, D1 database and compiled React assets. It does not depend on the owner’s laptop or a localhost tunnel. No external database TCP connection is used in this path. Hosting is managed through Sites; `.openai/hosting.json` preserves the project and logical DB binding. Publishing retains the existing owner-only audience.

`npm run build:hosted` produces `dist/server/index.js`, `dist/server/wrangler.json` and `dist/client`. The Worker exports `fetch(request, env, ctx)`. All API/domain/model modules are bundled into the Worker. Generated Drizzle migrations create and index persistent tables before upload. Do not edit previously applied migrations.

Local hosted-runtime verification: build, then run `npx wrangler d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .sites-runtime/hosted-test`, followed by `npx wrangler dev --config dist/server/wrangler.json --local --persist-to .sites-runtime/hosted-test --port 4173`. This isolated database is separate from the owner’s SQLite history.

For Sites publication, the Sites workflow pushes the reviewed source, builds/packages it, saves the matching archive version and deploys that exact version. A successful deployment-status response supplies the actual URL. No hosting credentials belong in source or archives.

Hosted live updates use HTTP checks every two seconds instead of a process-local SSE subscription. Each check fetches supported live sources and retains all pending persistence/settlement work with `waitUntil`. Finished matches remain frozen and excluded from repeated live fetching. Network and source latency still apply. The persistent local Node runtime continues to offer SSE.

Research uses a bounded budget of 24 uncached evidence requests per hosted invocation, retaining completed source records so subsequent fixture refreshes resume collection. It never publishes partially trained enhancements as a completed research job. Learning activation is guarded by a shared database lease and chronological validation. Updates wait for sufficient verified outcomes. No forecasting, research or live checks run when the app is unused; no cloud scheduler is provisioned.

Cloudflare background work has a limited post-response lifetime. Cached records survive interruptions, but long jobs can need additional refreshes. Resource limits on alternative hosting accounts must accommodate forecasting and training; the strict free Worker CPU allowance may be insufficient. See [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/). No paid plan was purchased in this workflow.

Online history starts in its own D1 database. Existing private local records are preserved locally and excluded from GitHub/source ZIP. A future explicit data migration should use verified backups, not an entire cache database upload.
