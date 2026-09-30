# Arata Odds

Mobile-first football research for an administrator and invited users: fixtures, real bookmaker snapshots, published and independent probabilities, value comparisons, daily guidance tickets and prediction history. All schedules and date boundaries use Africa/Kampala (EAT, UTC+3). No personal sports API keys or ChatGPT sign-in are required.

For account or app support, email [etopat@gmail.com](mailto:etopat@gmail.com) or [contact the owner on WhatsApp](https://wa.me/256791170164). These are the initial details; an administrator can change both in **Admin settings → Owner & support**. Saved contacts appear on the sign-in screen, mobile menu and dashboard footer; the links do not send messages automatically.

**Match Lab** searches fixtures by team or league, then creates a focused forecast with 1X2 probabilities, indicative full-time scorelines, source-backed form/H2H/squad evidence, and lower-, moderate- and higher-risk market scenarios. A ticket recommendation requires fresh exact-market bookmaker prices and sufficient verified model evidence; otherwise it advises skipping the match. On mobile, Match Lab is in the fixed bottom navigation; History, Model Lab, Profile and Admin are in the right-hand menu.

The **Admin** page edits public support contacts, searches user accounts and opens Add user in a dedicated modal. Its Data portability panel exports a JSON archive of fixtures, verified history, forecasts, outcomes, price snapshots, ticket records, support contacts and learning/research context. Import merges the archive into another local setup without copying passwords or sessions. Existing records remain intact; ticket ownership maps by email or falls back to the importing administrator. Imported verified historical matches help meet the model's normal coverage minimums, while learning changes still require later-match validation. See [API.md](API.md) for the endpoints and limits.

The public **Legal & Safety** page is available at `/legal` before sign-in and from the dashboard footer and mobile menu. It covers terms of use, a prediction disclaimer, privacy, responsible use and data provenance. The Ugandan regulator states that gambling participants must be at least 25; the app's prior “18+” label has been corrected. These notices describe the current product and should be reviewed when the service or applicable rules change.

## Start

Install Node.js 22.13 or later. In this folder, run:

```sh
npm ci
npm run start:local
```

Open http://localhost:5173. On Windows, double-click Start-Arata-Odds.cmd to start the app and open it in your browser. The launcher checks both services, reuses an existing healthy instance and starts hidden background processes. A supervisor restarts either service after an unexpected exit. Logs are in .local-data/runtime.log. Repeated startup failures stop retries and are reported.

On a fresh local database, sign in with `etomet2patrick@gmail.com` (or login name `etomet2patrick`) and the temporary password `Admin@123`. Change it immediately when prompted. The administrator creates other accounts from **Admin** using a name, email and phone. New users start with temporary password `arataodds123` and must change it at first sign-in. Use a unique random `ARATA_ADMIN_INITIAL_PASSWORD` for any publicly accessible deployment; the documented local default must never be published. The app stores salted password hashes and separate login sessions. Profile edits cannot change the account email.

The local React/Vite frontend proxies /api to the Node backend at 127.0.0.1:3001. SQLite persistence under .local-data works immediately. First refresh can take several seconds. npm run dev:portable runs the same app in a foreground terminal; keep that terminal open. The launcher must be run again after a computer restart.

For PostgreSQL, run `docker compose up -d`, set DATABASE_URL to `postgres://arata:arata_local_only@127.0.0.1:5432/arata`, then use the same startup command. Other PostgreSQL/Supabase database connection strings work through the Node pg adapter; keep them in private environment variables. PGSSL=require enables verified TLS. Schema is applied on startup. The PostgreSQL adapter was not tested against a running PostgreSQL server here.

The hosted build is `npm run build:hosted`: the same React application and complete API run in a Cloudflare Worker with D1 persistence. Hosted requests retain background work explicitly and research resumes from cached source records in bounded batches. The local and hosted databases are separate. See [SETUP.md](SETUP.md) and [DEPLOYMENT.md](DEPLOYMENT.md). The older Vinext development path remains available with `npm run dev`.

## Sources and limitations

| Source | Implemented behavior |
| --- | --- |
| BetPawa Uganda | Automatic public Uganda fixtures and real 1X2, BTTS, match/team totals, double chance, half-goal Asian handicaps, clean sheets, win-to-nil, odd/even and result-combination quotes. Captures exact selection/line, bookmaker, source URL and time. No login or personal key. |
| LiveScore | Public football live scores, provider match clock, HT/FT and day results. No key. Partial competition coverage; provider latency applies. |
| 1XBet Uganda | Safely parses public upcoming football page highlights. Its embedded payload omits odds. No prices inferred. |
| GSB Uganda | Coverage probe and owner-entered quotes; public automated access was restricted in testing. |
| SBA Uganda | Coverage probe and owner-entered quotes; its sports endpoint did not provide usable public odds in testing. |
| Betway Uganda | Coverage probe and owner-entered quotes; Uganda URL redirected to South Africa. Those prices are excluded. |
| Betwinner | Coverage probe and owner-entered quotes; public requests returned HTTP 401. |
| Football-Data.co.uk | Cached historical league results, goals, venue, form and H2H for the independent model. |
| ESPN public feeds | Published squad lists, dated team news, historical starting XIs and provider-confirmed upcoming XIs when explicitly available. These are provider records, not verified club registration lists. |
| Official MLS / Premier League | Dated player availability reports and official FPL statuses. Confirmed outs can affect validated player coefficients; doubtful players remain context. Coverage outside these competitions is incomplete. |
| StatsBomb Open Data | Licensed archival match lineups and actual shot-xG events with attribution. Old archives are inspectable but cannot alter current forecasts. |
| OpenLigaDB | Keyless community fixtures/results, H2H and recent form where covered. Partial league/season coverage. ODbL attribution. |
| Bet Better | Keyless published probabilities for six leagues, plus a separate public settled-record endpoint. CC BY 4.0 attribution to https://betbetter.world. No bookmaker prices in this feed. |

The web API uses curated official sources, public team search and embedded page data. It is not a general search-engine API. Discovery checks seven Kampala dates, up to 100 BetPawa fixtures per date, plus up to 100 fixtures across six model-covered leagues over the next 31 days. Limits/failures appear in the coverage report. Team search can find additional fixtures. No challenge, login restriction or geographic block is bypassed.

Apify is disabled. The zipped prompt pack was read as context; user instructions control scope and the requested probability-edge formula.

## Independent research and branding

Arata Model calculates its own probabilities using historical goals, home/away rates, form and H2H. Select Arata, Bet Better, the equal-weight blend or Automatic in the ticket builder and picks view. Model Lab documents paired outcomes and charts rolling probability errors. Automatic waits for 50 shared settled matches and statistically supported error differences before selecting a statistical leader. Ticket generation also checks current priced coverage across available predictors; coverage fallback does not establish superior accuracy. Arata and the blend are provisional; their medium-confidence selections appear only in clearly labelled review drafts when Cautious has no qualifying tickets. The expanded model learns player and rest associations against the goals/venue/form/H2H baseline. It enables adjustments only after sufficient starting-XI history and better performance on later held-out matches. Confirmed current XIs and dated official absence reports are shown with provenance; inferred lineups and doubtful headlines never become confirmed absences. Model Lab shows research progress, validation, baseline versus adjusted goals and actual archived shot-xG events. Current comprehensive injury coverage and fresh shot-event xG are not available across all leagues; missing information stays unknown. These validation results do not establish higher betting accuracy. See [MODEL.md](MODEL.md) for the full calculation, evaluation rules and limits.

The custom generated logo is applied to desktop/mobile navigation, the favicon, install manifest and offline screen. [BRAND.md](BRAND.md) records the identity, asset path and generation prompt.

## Prediction and ticket rules

- Value edge = model probability − 1 / decimal price. Value requires edge > 0.05. Expected return = probability × odds − 1 is separate.
- Match sources join on normalized home/away teams, competition and kickoff within 15 minutes. Conflicting fixtures remain separate. Odds and model estimates match exact market, selection, line and full-time period.
- 1X2, BTTS and half-goal totals/Asian handicaps use their own exact selected-predictor estimates. No 1X2 probability is reused for goals. Arata computes quoted double-chance probabilities from its score matrix; unsupported external estimates are never fabricated.
- Integer/quarter lines and draw-no-bet are excluded from automatic recommendations because refund/partial-settlement probabilities are absent. They are not silently treated as binary wagers.
- Higher win chance requires model probability ≥70%, HIGH provider confidence, non-negative edge and a price under 15 minutes old. This ranks estimated win chance, not objectively safest or guaranteed bets.
- Tickets allow 1–10 legs, one per fixture. Automated pre-match prices expire after two minutes, in-play prices after 30 seconds, and owner-entered pre-match quotes after 24 hours. Started fixtures require a current in-play quote. Price-only and in-play tickets display no model win chance. Saving locks the exact snapshots and does not place a bet.
- Build Ticket is the default landing view and automatically generates up to six alternatives with exactly the selected 1–10 picks. Date, team search and league filters apply. Generation reruns when settings or prices change. Cautious is the UI default and requires at least 75% probability per leg, HIGH confidence and 50% combined chance. Balanced requires 65% per leg, medium/high confidence and 25% combined chance. Long ticket requires 65% per leg and 5% combined chance, with higher risk clearly shown. All need positive model value, valid full-time binary markets, current matching quotes and no stale model. A successful model capture expires from generation after 30 minutes.
- The bounded generator considers up to 60 selections, at most three markets per fixture, and uses two 400-wide beam searches ranked by probability and model expected return. It returns different fixture sets. It does not claim an exhaustive mathematical optimum. Shared teams and duplicate fixtures are excluded. League mixing uses at least two leagues and caps any one league at half the picks, rounded up; it supports longer tickets even when fewer than ten leagues have coverage.
- Every generated ticket shows its estimated win and loss chances, weakest leg, combined odds, potential return, model expected return, source reasoning and advice about reducing its length. Advice is stored with a saved ticket. If ten qualifying matches are unavailable, the app explains the shortfall and never pads or silently returns fewer picks. Changing the selected length clears a previously loaded generated draft. Tickets remain alternatives, often sharing matches, rather than an independent portfolio. Budget guidance links to GamCare.
- History preserves every estimate. Accuracy counts settled snapshots, including multiple snapshots for one match. ROI uses actual saved ticket stakes and excludes pending tickets. Provider public performance remains separate.
- Explicit full-time regulation scores from LiveScore or OpenLigaDB settle supported markets. A locally elapsed clock never marks a match finished. Running tickets show current score and clock while preserving locked prices. Uncovered results can be entered manually after kickoff plus two hours. H2H/form influence the independent Arata model within documented bounds; they do not modify published Bet Better estimates.

## Finding and tracking matches

Today, tomorrow, this week, upcoming and a specific date use Kampala day boundaries. The public-source search field instantly filters the stored match list as you type; the Compile button also searches the supported public sources. History has a separate search matching either or both teams. LIVE bubbles show the current score and provider clock, with HT, FT and stoppage time such as 45 + 3' or 90 + 3'. Scores older than 30 seconds show a delay notice. Saved tickets remain research records and never place wagers.

## Data flow and files

Request memoization → in-flight deduplication → bounded memory → database cache → public source. Bet Better/OpenLigaDB responses cache 15 minutes; public BetPawa pre-match prices cache one minute; live scores and in-play prices cache 1.5–2 seconds in memory; LiveScore day results cache 10 seconds. Stale responses are labeled and excluded from recommendations. Fixture discovery is checked each minute; an independent price refresh runs every 30 seconds, using the one-minute upstream pre-match cache. Live sources are checked every two seconds while the app is visible, with no overlapping same-type requests. Returning to the app triggers a check. Network and provider delays prevent a guarantee of instant delivery. No off-app scheduler is included. Concurrent fixture ingestion commits are serialized so a discovery refresh preserves the newest live status.

Shared React frontend: app/ and components/. Local entry and configuration: frontend/ and vite.local.config.mjs. The optional Vinext/D1 entry remains available. API/domain logic: lib/. Portable Node and PostgreSQL adapter: backend/. D1 schema: db/ and drizzle/. Pure validation: tests/. API routes and examples: API.md.

The installable web manifest includes sized normal/maskable icons and an offline screen. Browsers present their native install control when eligible; there is no in-page install button. See [PWA.md](PWA.md). Odds and APIs are never served from service-worker cache. No native wrapper is included. The portable backend binds to loopback. Accounts and tickets are stored on the server and scoped by user.

## Checks

```sh
npm test
npx tsc --noEmit
npm run build:local
npm run build:backend
```

The delivery archive excludes dependencies, databases, credentials and generated caches. See VERIFICATION.md for observed test results.

The startup repair preserved existing local fixture, prediction and price records. Core dashboard requests omit the complete history log; History searches and paginates all immutable records on the server. Refresh reads only current prediction heads and settles only relevant pending records. Unchanged price recaptures do not create duplicate odds snapshots; unchanged model/price outputs do not create duplicate predictions. Existing historical records are preserved. Portable API responses support gzip. Hung refresh requests time out so later refresh attempts can resume. See REQUIREMENTS.md for the full implementation audit.

## Live-score and market upgrade — 27 September 2026

- Live appears before Today. Current playing fixtures use a 45-second freshness window; old unresolved LIVE flags no longer populate this filter. Search filters the selected period immediately.
- A shared SSE connection pushes score, clock and saved-ticket updates as sources respond. Source checks run every two seconds, with a two-second polling fallback. The full response has a deadline, so a stalled transport/body cannot stop the monitor. Saved legs use provider IDs and their own result dates independently of the board date.
- Published scorer names, goal minutes, assists, penalties/own goals, halftime scores and phases appear on match cards and saved legs. Scorer coverage is explicit and may be partial. Added time is formatted as `45 + 3'` / `90 + 3'`; no match clock is invented locally.
- Exact full-time market predicates now also cover home/away team totals, clean sheets, win to nil, match/team odd-even and 1X2+totals / 1X2+BTTS. Quotes, model probabilities, risk rules and settlement use the same exact outcome. Cautious screening remains unchanged; additional market choices are not inherently low risk.
- Current prediction indexes preserve every historical snapshot while avoiding repeated archive scans. Local SQLite uses WAL; score matching is indexed and full dashboard responses cannot undo a confirmed FT result or a newer saved score.
- If a source stops reporting a live game without an explicit final status, the published score remains visible with Awaiting confirmed FT. Two previously stuck September 26 matches were separately checked and their verified finals recovered with source attribution. This does not create automatic final-result coverage for every minor league.


## Ticket, final-result and PWA repair — 27 September 2026

- Build Ticket opens on Upcoming, which includes model-covered future fixtures. Automatic checks the recommended predictor, then currently priced alternatives; an explicitly selected predictor is respected. Exact 1–10-leg review drafts are available when strict risk targets cannot be met, provided every leg has a fresh matching price, positive estimated value, at least 65% model probability and medium/high confidence. These drafts explicitly fail the chosen strict target; they are not presented as qualifying Cautious tickets. No fixtures or probabilities are invented to fill a ticket.
- Independent price refresh avoids waiting for historical/squad research. Save validates the exact reviewed price again. League/search/date rules still apply. Generator and league controls avoid rebuilding on each unrelated live score update.
- Each unfinished saved leg receives priority live checks, including later legs in an already lost ticket. Up to 24 matches are checked in a batch; larger pools rotate fairly. Score, clock, scorers and per-leg outcome are matched by provider identities. Published scorer details use a closed expandable panel on every applicable match. Overall ticket success/loss has the strongest visual status.
- Old unresolved live flags become Awaiting confirmed FT and enter a separate result recovery queue. Only explicit provider finals settle results. Confirmed FT matches leave live polling; incomplete archived scorer details can be checked once. Final score/clock and confirmation timestamp do not drift with later refreshes. When a source provides a real end timestamp, the app shows Ended; otherwise it honestly shows the frozen Final confirmed time in Kampala.
- SQLite runs in a worker so audit reads/writes cannot block the live stream. Client payloads shorten repeated bookmaker collection URLs to verified event links and can omit duplicate fixture quotes; stored evidence and historical records remain intact.


## Automatic self-learning

Arata v3 now retrains seven core forecasting weights and calibrates its own probabilities from immutable pre-match forecasts paired with verified outcomes. League/market/range corrections, chronological fitting/calibration/validation, rejected-candidate retention and prospective rollback are automatic. Model Lab shows its evidence counts, learned coefficients, reliability chart and decision history. The blend receives corrected Arata estimates; Bet Better stays separate. Existing tickets/history remain locked. Updates require sufficient new settled matches rather than being manufactured from repeated snapshots. See [LEARNING.md](LEARNING.md) for all sample thresholds and safeguards.

## Release: performance and navigation

Model Lab opens from the header. On mobile the header and bottom navigation stay fixed. Saved tickets have their own Tickets view with team/name search, All/Pending/Running/Won/Lost filters and counts. Pending tickets appear first, with newest first inside each group; settled tickets follow newest first. Build Ticket focuses on generation and review.

At the Kampala day boundary, the background scheduler checks current forecasts and prices and saves up to three qualifying, deduplicated guidance combinations per active account in **Tickets**. Opening the app also queues a retry when no qualifying prices were available. These automatically recorded suggestions need no manual review and do not place wagers. Manual tickets retain their price review step. A scheduled attempt may have no ticket when trustworthy, current model and bookmaker coverage is insufficient; the Tickets view shows the reason. See [DEPLOYMENT.md](DEPLOYMENT.md) for scheduler requirements and [INFINITYFREE.md](INFINITYFREE.md) for the InfinityFree limitation.

Charts load on demand. The initial compiled JavaScript is about 419 KB (132 KB gzip), down from the previous roughly 814 KB (245 KB gzip). Cached match state paints before discovery refresh completes. Independent sources load in parallel; slow coverage probes have short deadlines. Live checks keep their existing strict cadence. See [PERFORMANCE.md](PERFORMANCE.md).


### Ticket review and appearance

Generated alternatives open a keyboard-accessible Ticket Review modal. Manual drafts use Review draft. The reference stake only calculates a possible return; saving adds one research record to Tickets. Identical combinations cannot be saved again, including under another name, price or stake.

The header includes a Light/Dark toggle. The original dark palette remains the default; the light palette uses white and gray with deep mint accents. The selected mode is remembered on the device. Motion respects the operating system's reduced-motion preference. Ticket combinations calculate in a dedicated browser worker; a phase indicator distinguishes collecting data, updating forecasts and ranking combinations. No fake percentage completion is shown.
