# Arata Odds API

Date windows and display schedules use Africa/Kampala. Payloads retain UTC ISO timestamps and include kickoffEAT for fixture/prediction schedules.

| Method | Route | Behavior |
| --- | --- | --- |
| POST | /api/web/ingest or /api/refresh | Refresh public sources (optional range query parameter; date:YYYY-MM-DD fetches that Kampala day); persist fixtures/quotes; generate predictions and settle covered results. |
| GET | /api/web/search?q=Arsenal | Bounded public-source and stored-fixture search; persists compiled results. Query 2–80 characters. |
| GET | /api/web/sources | Source availability, limitations and discovery coverage. |
| GET | /api/live?range=today | Start an independent refresh and immediately return the current light delta: liveFixtures, liveSelections, saved ticket progress, sources and liveUpdated. No response cache. |
| GET | /api/live/stream?range=live | SSE stream of score/clock/scorer and saved-ticket updates. Two-second source cadence, heartbeat, bounded reconnect and no proxy buffering. |
| POST | /api/live/refresh | Refresh live scores and in-play quotes; settle explicit final results. |
| GET | /api/state?range=week&history=0 | Fixtures, current picks, tickets, metrics, suggestions and higher-win-chance picks. history=0 omits the full log; otherwise the first history page is included; /api/history pages through the full log. |
| GET | /api/health | Database readiness, application identity and Kampala timezone. |
| GET | /api/fixtures?range=today | Normalized fixtures, probabilities, 1X2 prices and multi-market quotes. |
| GET | /api/fixtures/h2h?id=FIXTURE_ID | Covered previous meetings and recent form. |
| GET | /api/odds/snapshots?fixtureId=FIXTURE_ID | Persisted price snapshots; optional fixture filter. |
| POST | /api/odds | Save owner-entered 1X2 prices. |
| POST | /api/odds/market | Save an owner-entered quote for an exact supported model market/line. |
| GET | /api/predictions?range=week | Latest pending selections. |
| GET | /api/history | Every prediction snapshot and current outcome. |
| POST | /api/predictions/generate | Refresh and generate immutable snapshots. |
| GET / POST | /api/tickets | Read records / save ticket with locked prediction IDs, available quote selection IDs, or mixedSelections. |
| POST | /api/tickets/suggest | Model-priced combinations; body supports range, query, leagues, mix, legCount (1–10; maxLegs remains an alias), risk (cautious/balanced/extended), and priority (chance/value). |
| POST | /api/fixtures/result | Confirm an uncovered final regulation-time score. |
| GET | /api/analytics/performance | Settled accuracy, actual-ticket ROI and counts. |
| GET | /api/analytics/trend | Cumulative accuracy by Kampala prediction date. |
| GET | /api/results | Cached Bet Better public record, separate from app metrics. |

Ranges: live (fresh playing matches only), today, tomorrow, week (today plus six days), upcoming (today plus 30 days), date:YYYY-MM-DD (one validated Kampala date).

Owner-entered market quote:

```json
{"fixtureId":"ID_FROM_FIXTURES","market":"TOTALS","selection":"over","line":2.5,"bookmaker":"GSB Uganda","odds":1.9}
```

Market values: 1X2 (home/draw/away), BTTS (yes/no), TOTALS (over/under and a half-goal line), HANDICAP (home/away and signed half-goal line). FT means regulation time plus stoppage time. Asian handicap line is relative to the selected team's score.

Owner-entered 1X2 prices:

```json
{"fixtureId":"ID_FROM_FIXTURES","bookmaker":"SBA Uganda","odds":{"home":2.2,"draw":3.4,"away":3.1}}
```

Save a research ticket:

```json
{"name":"Weekend ticket","predictionIds":["PREDICTION_ID_A","PREDICTION_ID_B"],"stake":1000}
```

A price-only or running research ticket can use IDs from state.eligibleSelections or live.liveSelections:

```json
{"name":"Running ticket","selectionIds":["AVAILABLE_QUOTE_ID_A","AVAILABLE_QUOTE_ID_B"],"stake":1000}
```

Mixed legs use mixedSelections: an array of {"id":"...","kind":"quote"} or {"id":"...","kind":"prediction"}. Only one pick per fixture is allowed. Missing, suspended or expired selections are rejected. Automated pre-match quotes must be under two minutes old, live quotes under 30 seconds old. Products containing a price-only/live leg have null probability and expectedReturn.

League IDs for the suggestion filter are the lower-case fixture league names, as returned by the shared leagueOptions helper:

```json
{"range":"week","query":"","leagues":["premier league","la liga"],"mix":true,"maxLegs":2,"priority":"chance"}
```

An empty leagues array includes all available leagues. mix requires distinct leagues. Rank by chance or value; no qualifying picks produces an empty list rather than invented estimates.

Stake is recorded in personal units; use UGX consistently if desired. Returns include stake. No bookmaker account or wager placement is involved.

Each quote contains bookmaker, market, selection, line, odds, period, captured, sourceUrl and external identifiers when supplied. Model fair odds never become bookmaker quotes. Missing prices stay missing. Stale cache is flagged.

Invalid input: JSON error and HTTP 400. Unknown route: 404. Writes enforce origin checks and a 16 KB request limit. Source URLs are fixed by the adapter; no arbitrary URL fetch is accepted. Local backend binds to loopback; hosted access must remain private.

## Automatic ticket generation

POST /api/tickets/generate returns a generation report and up to six ticket alternatives. Run /api/refresh for the date window before calling it if current quotes are unavailable; the app does this automatically each minute while visible.

```json
{"range":"week","legCount":3,"risk":"cautious","priority":"chance","mix":false,"leagues":[]}
```

The response includes legCount, eligibleMatches, eligiblePicks, excludedPicks, risk rules, generatedAt, tickets and reason. Every returned ticket has exactly legCount selections, advice, combined odds, product-based probability, expected return and a one-unit preview. Empty results explain insufficient coverage or failed risk/league rules. Invalid counts outside 1–10, fractional counts and unknown risk profiles are rejected. /api/tickets/suggest retains the list-only response with the same rules. Saved tickets retain their advice and locked prices; ten selections are accepted and eleven are rejected. No bet is placed.

## Independent predictors

- `GET /api/models/compare`: prospective, deduplicated paired metrics, rolling chart, comparison records, confidence intervals and Automatic recommendation.
- `GET /api/models/research?id=FIXTURE_ID`: current Arata probabilities, expected goals, form, H2H, sources, availability context and exact matched blend markets.
- `GET /api/models/evidence?id=SHA256`: immutable source evidence referenced by a prediction's `evidenceId`. Stored once per evidence content in a reserved persistent-cache namespace; it is not a live web response.
- `GET /api/state`: adds `allPicks` with predictor provenance and `comparison`; `picks` contains Automatic's selected predictor. `history=0` still supplies comparison summaries.
- `POST /api/tickets/generate`: `predictor` accepts `auto`, `arata`, `betbetter`, `blend`. Example: `{"range":"week","legCount":2,"risk":"balanced","predictor":"arata"}`. No silent predictor substitution.

Arata's data refresh is part of the existing `POST /api/refresh`. Forecast computation does not depend on a Bet Better response. Exact quoted alternative markets are calculated locally. Missing historical coverage produces an abstention reason. See MODEL.md for freshness, training cutoff and availability limitations.

## Squad research and scalable history

- `GET /api/models/jobs`: six-league research progress, sample counts, source failures and validation status. Background jobs start with normal fixture refresh and resume from persistent source caches.
- `GET /api/models/archive?league=mls`: licensed StatsBomb archive season, match xG totals and regulation shot events with player/source provenance. Supported IDs: mls, epl, bundesliga, la-liga, serie-a, ligue-1. Archival data is not today's lineup or schedule.
- `GET /api/models/research?id=...`: `arata.evidence.advanced` now includes published squads, provider-confirmed XI status, official absence reports/date windows, baseline/adjusted goal rates, player/rest validation and source-dependent coverage.
- `GET /api/history?q=TEAM&outcome=all&page=0&pageSize=20`: searchable **complete** immutable log, server pagination. Returns `{records,total,page,pageSize,pages}`. Every search word must match the two team names; literal `%`/`_` are escaped. Outcomes: all/won/lost/pending; page size 1–100. This replaces the old unbounded array response. Dashboard summaries still count all saved rows.

No arbitrary remote URL or prediction-history replacement is accepted. Match/roster sources are fixed by the adapter. Confirmed OUT entries may enable learned corrections; doubtful reports and news alone cannot. See MODEL.md for all gates and the limits of free current xG/injury coverage.

### Exact additional full-time markets

`HOME_TOTALS` / `AWAY_TOTALS`: over/under with a half-goal `line`. `HOME_CLEAN_SHEET` / `AWAY_CLEAN_SHEET` and `HOME_WIN_TO_NIL` / `AWAY_WIN_TO_NIL`: yes/no. `ODD_EVEN`, `HOME_ODD_EVEN`, `AWAY_ODD_EVEN`: odd/even. `RESULT_TOTALS`: home_over, home_under, draw_over, draw_under, away_over, away_under with a half-goal line. `RESULT_BTTS`: home_yes, home_no, draw_yes, draw_no, away_yes, away_no. Automatic recommendations require an actual available quote and an exact model probability. Availability depends on the source; unsupported refund lines remain excluded.

BetPawa discovery partitions views into at most seven market IDs per query, then merges all price groups by fixture and exact market. SSE liveFixtures include `goalScorers`, `halfTimeScore`, `livePeriod`, `eventsCaptured` and `eventsScore` where published. Saved progress preserves each original `fixtureId` and locked price. Completed matches remain available in saved progress irrespective of the selected board range. Late snapshots cannot restore Live after confirmed FT.


## Independent price and ticket release

- `GET /api/prices?range=upcoming`: independently refresh public bookmaker prices without waiting for historical research; no response cache. The browser checks every 30 seconds, while pre-match upstream responses use the existing one-minute cache. Missing/suspended markets are removed from availability rather than kept indefinitely.
- `GET /api/state?range=upcoming&history=0&compact=1`: omit duplicate fixture quote arrays; `compactQuotes: true` tells clients to hydrate them from `eligibleSelections`. Forecasts retain the selected predictor and use the current exact market price for their displayed edge.
- `POST /api/tickets/generate`: supports predictor (`auto`, `arata`, `betbetter`, `blend`), range, query, leagues, mix, legCount 1–10, risk and priority. Strict `tickets` remain separate from `reviewTickets`. Review drafts have `reviewOnly: true` and explicit failed-risk-target advice. Automatic coverage fallback is distinct from the statistically supported model leader; explicit predictor choices never fall back.
- Ticket saves can include `reviewedPrices` from the reviewed draft. A changed price rejects the save and requests a renewed review; saved locked odds never track later market moves.
- `GET /api/tickets` returns progress for every leg. `legOutcome` is won/lost/pending; score, clock, phases, goal incidents and coverage are independent for each match. `endedAt` exists only when published by a provider. Otherwise `finalConfirmedAt` identifies the fixed confirmation time. Neither timestamp is a live fetch time.
- Confirmed completed legs are excluded from live polling. A one-time completed-match detail request is possible when archived scorer coverage is missing. Stale unresolved matches are marked awaiting-result and retried in a separate recovery queue, without fabricated final scores.


## Self-learning routes and snapshots

`GET /api/models/learning` returns the persisted feedback registry, active coefficient/calibration profiles, eligible/core match counts, rules, range reliability, prospective drift and latest 50 decisions. It queues a background check when due. `POST /api/models/learning/train` returns HTTP 202 and queues a check; it cannot force activation or bypass validation. Jobs are deduplicated, with a five-minute automatic cadence.

New Arata predictions include `learningInput` with schema, frozen goal features, raw probability, starting-baseline probability and feedback revision. Model evidence includes `coreFeatures` and `learning` provenance/weights. The corrected `probability` feeds fair odds, edge, ticket filters and blending. Each accepted update affects subsequent research forecasts; immutable old snapshots and saved tickets are preserved.

## Hosted runtime

The hosted app exposes the same API with D1 storage. `/api/live/stream` returns 204 to select the two-second HTTP fallback; `/api/live` returns `connection: "polling"`. Local Node retains SSE. Saved tickets are presented in the separate Tickets module; GET `/api/tickets` retains its existing complete records and per-leg progress response.

### Hosted refresh progress

On the hosted runtime, `POST /api/refresh?range=upcoming` acknowledges a background refresh with HTTP 202 (`accepted`, `inProgress`). Read `GET /api/sync/status?range=upcoming` until `inProgress` is false. If `nextStage` is `forecast`, POST refresh again with the same range and wait for that phase to finish; `nextStage: ingest` marks a completed cycle. Read `/api/state` after each phase to display available data. Fixture collection and forecasting have separate background lifetimes. Ingestion, research leagues, and forecast writes rotate through bounded batches. Local Node refresh remains synchronous. The original fixture periods, Kampala times and immutable forecast/outcome validation rules remain in force.


### Unique ticket collections

Saving an already recorded combination returns HTTP 409 with a readable message. Combination identity uses the teams (canonical aliases), Kampala match date, selection, market, line and period, independent of pick order, name, stake, odds snapshot or predictor. Matching fixture IDs also recognize rescheduled fixtures. Existing tickets are checked without rewriting or deleting them. Deterministic IDs and an atomic ticket/leg insertion prevent concurrent identical saves from creating extra records. A different selection or match remains a separate ticket.

Ticket progress supplies the current published kickoff when available. The Tickets page shows scheduled kickoff in Africa/Kampala for pending legs and hides it after each leg settles, independently of the overall ticket status.
