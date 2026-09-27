# Arata Odds setup

## Quick start

1. Extract the archive. Open the `arata-odds` folder.
2. Install Node.js 22.13 or newer (Node 22 LTS is the tested runtime).
3. Open a terminal in that folder and run `npm ci`. This downloads the exact dependencies from the included lockfile.
4. Run `npm run start:local`, or double-click `Start-Arata-Odds.cmd` on Windows.
5. Open http://localhost:5173. Allow the first public-source refresh to complete.

No personal sports API keys are needed. Public sources can be unavailable or region restricted; the coverage panel reports gaps. Never substitute fabricated prices or scores.

## Everyday use

Build Ticket generates alternatives from real available selections. Pick a date window, leagues, model, risk preference and 1–10 legs. Review prices and stake before saving. Tickets lists saved records, pending first, and follows all their unfinished matches. Saving does not place a bet. History shows the immutable prediction log. Model Lab, in the header, shows evidence and validation. All schedules use Africa/Kampala.

## Storage and backups

The local database is `.local-data/arata.sqlite`. Shut down the app cleanly before copying the database; if copying a running SQLite database, use SQLite’s online backup API instead of copying its main file alone. Preserve this folder when updating source. It contains private tickets, outcomes and cached research. It is intentionally excluded from Git and the download archive. An extracted copy starts with an empty database and obtains its own public data. Local and hosted records do not synchronize automatically.

For PostgreSQL, start the included service with `docker compose up -d`, then set `DATABASE_URL=postgres://arata:arata_local_only@127.0.0.1:5432/arata` before launching. Change those development credentials for external hosting. `PGSSL=require` enables verified TLS for a suitable server. The SQLite/D1 release was tested; a running PostgreSQL deployment was not tested here.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev:portable` | Foreground local frontend/backend; keep terminal open |
| `npm run build:local` | Compile portable frontend |
| `npm run build:backend` | Compile Node API |
| `npm run build:hosted` | Compile full hosted frontend and Worker API |
| `npm test` | Domain, persistence, learning, ticket and PWA checks |
| `npx tsc --noEmit` | Check types |

## Troubleshooting

If localhost does not open, inspect `.local-data/runtime.log`, check Node’s version and rerun the launcher. The launcher reuses healthy services and restarts failed ones. If prices are missing, inspect feed coverage and refresh; a blocked bookmaker is a coverage gap, not an app setup error. If an update is available, save or finish a draft before using Update app because it reloads the screen. No stale prices or results are cached by the service worker.

See README.md for source coverage, API.md for endpoints, MODEL.md and LEARNING.md for forecasting, PWA.md for installation, BRAND.md for branding, REQUIREMENTS.md for scope and VERIFICATION.md for checks.
