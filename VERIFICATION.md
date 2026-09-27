# Verification — 26 September 2026, Kampala time

## Startup repair

- The original localhost:5173 failure was a stopped preview process. Windows worker-preview startup was unreliable. Added a standalone local React/Vite entry using the same interface and a portable Node API, plus a background launcher and restart supervisor.
- Both service health endpoints returned ready. The home page returned HTTP 200 and rendered in the in-app browser. The existing database was preserved: migration retained 1,524 fixtures, 12,183 prediction snapshots and 12,676 odds-snapshot records; subsequent real refreshes continued adding records. No existing record was deleted.
- Stopping the app's own API process triggered automatic supervisor recovery while the frontend remained open. Reusing a healthy running instance was verified by the launcher.
- Startup requests omit the full prediction-history log, which loads on demand. API compression was observed as gzip. Refresh requests have timeouts so a stalled request cannot hold a refresh guard indefinitely.

## Automated and real-data checks

- All 31 domain/parser/live/league tests passed. TypeScript validation and the local production frontend build passed. Portable API bundle compilation passed.
- Real week-window ingestion showed 515 fixtures and 14,081 stored prediction snapshots at one check. Connected BetPawa discovery reported 424 fixtures and 9,865 exact market quotes; Bet Better reported data for all six configured leagues. Counts are capture observations and change over time.
- A real live response contained 216 visible records and 1,317 eligible in-play quotes. A later live check completed in 690 ms; a tomorrow state check completed in 1.3 seconds with 129 fixtures, 46 model selections and 2,464 eligible quotes. Both supported gzip.
- In an isolated test database, two actual in-play selections saved a research ticket. Readback preserved locked odds, null model probability and progress. Duplicate selection IDs were rejected. League-scoped suggestions were checked. Main saved tickets were not changed by these tests.
- The public Bet Better settled-record endpoint returned successfully and its separate statistics rendered in History. Pending app estimates remained excluded from accuracy and ROI.

## Browser checks

- Build Ticket displayed real EAT schedules and published BetPawa prices. One league limited the board to that league; selecting a second league included both. Auto mix and chance/value controls changed visibly.
- Two pre-match prices, 2.16 and 2.27, showed combined odds 4.90 and potential return 49.03 for stake 10. The draft was cleared after the check; no main research ticket was saved.
- Typing Nautico immediately limited the match board to that team. History search for Arsenal returned only matching prediction rows, including home and away appearances. Tomorrow selection and real future fixtures were checked.
- Live refresh timestamps advanced. Browser error/warning logs were empty at the final inspection. Obsolete ticket-board fixtures with no eligible quotes were removed, and league labels distinguish identically named competitions. Stable LiveScore event IDs repair older league aliases and hide duplicate displayed events while preserving all referenced history records.
- At a 390 × 844 phone viewport, History measured width 375 and scroll width 375. A discovered history-table overflow was repaired. The temporary viewport was reset.

## Remaining limits

See REQUIREMENTS.md for the full audit. Automatic odds from GSB, SBA, Betway Uganda and Betwinner are unavailable in the verified public sources; 1XBet highlights omit odds. PostgreSQL integration, hosted deployment and a native wrapper were not verified/completed. No actual app accuracy/ROI track record can be established until its saved predictions and tickets settle. Polling targets cannot guarantee immediate upstream score delivery. No bets were placed.

The delivery archive excludes dependencies, databases, credentials and generated caches. Test tickets are isolated from the main app and excluded.

## Automatic ticket generation extension

- All 37 tests passed after exact 1–10 pick generation was added. Tests cover varied ticket sets at every length, risk floors, no padding, no repeated teams, current prices, confidence, invalid lengths, mixed-league concentration, weakest-leg advice and manual ten-pick arithmetic. TypeScript and the local production build passed.
- Real source ingestion supplied 55 model picks and 5,992 eligible quotes at capture time. Eight qualifying selections from five matches produced six exact two-pick and six exact three-pick alternatives. The highest-chance two-pick example showed 78.0% model product probability and 1.32 combined odds; selecting value ranking returned a different 71.8% example. These uncalibrated estimates and prices are observations, not assured outcomes.
- Selecting ten picks reported the five-match shortfall. Controlled inputs verified generation of exact ten-pick alternatives when enough qualified matches exist. The generator does not invent additional covered model picks.
- An isolated database saved ten actual published quote selections, rejected eleven, saved a real generated two-pick ticket and preserved its advice on readback. The existing main saved ticket was not modified or replaced.
- Browser checks confirmed automatic two/three-pick rebuilds, risk profiles, ten-pick selection, chance/value ranking, the explanation when mixed-league coverage is insufficient, and loading a generated ticket with its arithmetic and advice. Changing the pick count cleared a previously loaded generated draft. No main test ticket was saved.
- Final phone check at 390 × 844 measured content width 375 and scroll width 375. The refreshed development server loaded the new card styles; pick details and advice displayed on separate readable lines. The temporary viewport was reset and the generated-ticket preview was saved.
# Branding and independent-model release — 27 September 2026

- 48 automated tests pass, including normalized probability totals, alternative-market complements, quoted double chance, future-data exclusion, sparse/stale-history abstention, source-alias deduplication, blend alignment and statistically guarded predictor selection.
- TypeScript checks, portable backend build and production frontend build pass. The frontend build retains its advisory about the shared chart/UI bundle size.
- Both local service health endpoints report ready; app runs at http://localhost:5173.
- All six historical CSV sources returned valid data without credentials. News feeds supplied public headlines; coverage is explicitly partial and no verified injury list was fabricated.
- A live fixture-window check showed 365 displayed fixtures, 17 with independent historical forecasts, and 48 independently calculated double-chance selections. Counts change as public fixtures and prices refresh. The current covered window was MLS-heavy during an international schedule.
- The real-data generation endpoint returned six Arata-only ticket alternatives, three Bet Better alternatives, and six blended alternatives in the final check. The UI also rendered six exact two-pick Arata tickets with model provenance, quoted prices, EAT times and risk advice. No test ticket was saved to the owner's database.
- The independent evidence endpoint returned the exact archived five-match form and coverage for a prediction's SHA-256 reference. Forecasts and user tickets remain preserved.
- Model Lab shows 0/50 shared settled comparisons at release, with no fabricated historical forecast chart. Controlled tests verified that a supported leader can be selected after the paired threshold and that tied or insufficient samples retain the baseline.
- Logo is a generated transparent RGBA PNG, 1254 × 1254; alpha ranges from 0 to 255. The app serves it successfully and displays it in desktop navigation and the mobile header. Manifest dimensions match the actual file.
- Phone layout verified at 375 × 844 with no horizontal overflow; visible logo loaded successfully. Desktop layout, independent forecast probabilities and source/form details were visually inspected.

## Squad, player-impact and event research release — 27 September 2026

- All 71 tests pass. TypeScript, the production frontend and portable backend compile successfully. Tests cover as-of result/lineup guards, shot-event validation, chronological player validation, absence/lineup conflicts, independent probability totals, duplicate schedule deduplication before sample limits, ticket rules, and paginated history queries.
- All six resumable research jobs completed with no job errors. Observed historical XIs: MLS 618, EPL 394, Bundesliga 321, La Liga 371, Serie A 381 and Ligue 1 348. Published squads: 30, 20, 15, 15, 18 and 17 respectively; this is partial coverage, not every registered league squad. Player/rest adjustment validation passed for 12, 8, 0, 2, 5 and 0 teams respectively. Validation is per team/component and is not proof of betting precision.
- Actual licensed StatsBomb archival events were collected for 6, 60, 34, 35, 60 and 32 matches respectively. MLS has 146 actual shots. All current xG adjustment gates remained inactive: archive data is too old or insufficient for current forecasts. ESPN player xG leaders are not misrepresented as complete match xG.
- The actual upcoming-window API check returned 841 fixtures, 102 independent models and 90 forecasts with expanded evidence in the later check. Columbus Crew versus Inter Miami probabilities summed to 1 within floating-point tolerance, with published squad and official MLS report provenance. Its home component abstained; the supported away adjustment changed expected goals from 1.827 to 1.757.
- Actual Arata-only generation returned six exact two-leg alternatives, each with advice, after refreshing prices. An earlier stale-price check correctly returned no tickets; fresh re-captures restored eligible selections. No test ticket was saved to the owner database; the existing single ticket remained present.
- Searching the complete prediction log for Columbus returned 8,700 matching snapshots across 435 pages. Adjacent 20-row pages had no repeated IDs. More than 275,000 historical snapshots remain preserved; dashboard and history requests no longer deserialize the entire odds/prediction archive.
- The active collector uses ESPN, official availability sources and licensed StatsBomb data. Automated FotMob collection was removed after its published restriction was verified; the request guard blocks that host and old caches are not consumed.
- API/health and frontend/health return ready. Phone and desktop research/history rendering and source attribution are checked in the in-app browser; final screenshots accompany the release.
- Coverage is explicit: provider-confirmed XIs are not club-registration certification; official availability reports are currently MLS/PL only; fresh comprehensive injuries and event-xG cannot be promised without an additional permitted data source.

- Final browser history search returned 20 Columbus-containing rows on its first page. Desktop research shows official report dates, unknown starting XI status, the baseline goal rates, and withheld/validated adjustment reasons. Phone layout remains within the viewport; temporary overrides are reset. Screenshots: `../Arata-Odds-squad-research.png` and `../Arata-Odds-research-mobile.png`.

## Live preview and expanded-market release — 27 September 2026

- All 91 tests pass; TypeScript, the portable backend and production frontend compile. New coverage includes a non-responsive transport/body deadline, actual LiveScore goal incidents, added-time/penalty/own-goal parsing, saved provider-ID matching, exact extra-market probabilities and settlement, confirmed FT precedence, repeated source deduplication, international friendly aliases and BetPawa's seven-market view validation.
- The running app was checked on desktop and at 375 × 844. Live appears before Today, keyword filtering returns the specific live match, named scorers/assists and HT scores render, added time renders as 90 + 4', and saved preview preserves locked prices. Phone document width remained inside the viewport. Temporary viewport overrides were reset.
- A successful ten-second transport check received 24 SSE updates; headers arrived in 65 ms, initial data in 183 ms and first fresh data in 237 ms. Polling fallback took 203 ms and full Live state 428 ms. Another check received 26 updates with first fresh data around 1.8 seconds. These are observed local samples, not upstream latency guarantees; individual source updates can be delayed.
- Actual expanded-price discovery returned 16,520 extra eligible quotes across ten additional market families, 1,336 independent extra-market estimates and six exact two-pick Arata alternatives with advice. Counts and eligibility vary as prices expire and fixtures start. No test ticket was saved and the existing single ticket and complete prediction audit remain present.
- Both stuck saved legs were checked against explicit finished match pages: [Cruz Azul U19–Toluca U19, 1–2](https://www.elbotola.com/es/analytics/match/y0or5jh9xo44qwz) and [Nova Cidade–Goytacaz, 1–2](https://www.flashscore.co.id/pertandingan/sepak-bola/goytacaz-2HVT1AM4/nova-cidade-AcJHaaIn/?mid=Uimr4SfM). The app records reviewed source attribution; their finals are FT in saved preview. England–Spain additionally displays all five published goal events. Original ticket odds/stake were preserved and normal result settlement completed the ticket.
- A bookmaker response without an explicit final state is not automatically treated as FT. Such matches retain their last published score and a visible Awaiting confirmed FT label. Scorer details remain partial when a source does not publish names or all incidents.
- Screenshots: `../Arata-Odds-live-mobile.png`, `../Arata-Odds-live-updates.png`, `../Arata-Odds-saved-ticket-updates.png`. Full-page captures of a streaming page can show stitching artifacts; the final mobile proof uses a single viewport capture.

- A subsequent warm check after the lightweight Live dashboard change delivered 28 SSE updates in ten seconds, first fresh data in 342 ms, fallback in 233 ms, and full Live state in 360 ms. An earlier cold/expanded-data sample took 3.9 seconds for first fresh data and 5.5 seconds for full state; performance is variable and the light path addresses that archive-loading delay. Live-only snapshots also remove ended/duplicate cards immediately rather than retaining them until expiry.

- Verified China/China PR provider aliases are joined on exact opponent, competition and kickoff. A fresh LiveScore clock takes precedence over a lagging bookmaker clock while its current prices are still updated. This is a specific verified alias; unfamiliar names are not joined by fuzzy guesswork.


## Ticket recovery, every-leg progress and PWA release — 27 September 2026

- All 108 automated tests passed. Coverage includes strict versus review generation at exact 1–10 lengths, predictor choice, independent quote repricing, all saved live legs, fair polling rotation, immutable FT clocks/times, stale-live recovery, per-leg settlement, SQLite worker atomic rollback, compact transport and PWA cache exclusion. TypeScript and both build targets passed. The frontend retains a non-fatal bundle-size advisory.
- Real upcoming fixtures produced two strict one-leg alternatives and one strict two-leg alternative; three through ten produced six exact-length Arata review alternatives at capture time. Review drafts clearly disclose their provisional probabilities and failure to meet the Cautious target. Counts and prices change. No test research ticket was saved to the owner's database.
- Browser review loaded an actual ten-leg draft, with ten builder legs, matching sidebar legs, advice and an enabled save control. This was not saved. Mobile 375 × 844 had no horizontal overflow (document width 369). The real saved three-leg ticket shows prominent TICKET WON, independent Pick won statuses, all three FT scores, frozen confirmation times and three closed scorer expanders.
- The owner's one real saved ticket and locked prices remain intact. Its three confirmed scores are 2–3, 1–2 and 1–2. Five published named goal events are available for England–Spain; the two minor-league legs disclose missing named scorer coverage. Absence of incidents is not represented as no goals.
- A final stream sample returned headers in 188 ms, first fresh event in 433 ms and 18 events in ten seconds; fallback completed in 838 ms and full Live state in 772 ms. This is an observed warm sample, not a guaranteed source delivery time. No old live flags older than four hours remained in the checked dashboard; unresolved finals are explicitly awaiting confirmation.
- Independent prices and compact transport substantially reduce repeated payload/evidence work; stored audit records are unchanged. SQLite query/transaction work no longer runs on the score event loop.
- Manifest/icon dimensions and service-worker cache policies passed tests. The running browser activated the updated worker. Production frontend builds include compiled offline-shell assets; development mode retains its dedicated offline page. Actual phone installation and public HTTPS hosting were not performed.
- Mobile proof: `../Arata-Odds-tickets-mobile.png`. Source delivery excludes the live database, dependencies, credentials and caches. Minor-league scorer/final coverage and upstream latency remain explicit limitations.

## Prepared-batch cloning repair

The portable database adapter now strips statement methods before sending transaction data to the SQLite worker. A regression test uses the actual production adapter with bound batches, verifies atomic rollback and existing locked-ticket preservation, and verifies recovery from a rejected non-cloneable parameter. All 109 tests pass. Backend restarted with the corrected adapter; refresh and Build Ticket were checked against the running app.

## Validated self-learning release

- All 123 tests pass. TypeScript, portable backend and production frontend builds pass. New cases cover genuine core-weight changes, recurring overconfidence correction, disjoint chronological blocks, unchanged fitted parameters when holdout labels change, unverified/conflicting final rejection, no reuse of consumed validation windows, probability-support abstention, forecasting-frame integrity, exact event coherence, prospective rollback and actual database persistence/restart.
- An isolated 800-match controlled dataset exercised the real automatic orchestration and database adapter: a validated calibration revision activated, committed atomically with its immutable audit, survived restart and left original prediction payloads and the locked ticket record unchanged. Controlled validation successes are tests, not claims about the owner's real accuracy.
- Actual public-source refresh at 2026-09-27T17:20:42Z returned 1,244 fixtures, 83 current v3 Arata models and 2,227 v3 forecast snapshots with frozen schema-1 inputs. All checked 1X2 totals were one and raw probabilities were valid. The existing single saved ticket remained Won.
- The real registry contains nine eligible settled Arata matches and zero settled matches with the newly introduced core inputs. It correctly retains starting rules and reports Collecting verified outcomes: 9/200 distinct matches. Pending v3 forecasts contribute only after a verified final result; neither activations nor input history were fabricated.
- Desktop Model Lab shows real counts and reliability ranges. At 375 by 844, document width was 360 with no horizontal overflow. The phone and desktop learning panels were visually inspected, and the temporary viewport was reset. Screenshots: ../Arata-Odds-self-learning.png and ../Arata-Odds-self-learning-mobile.png.
- Final backend health is ready and the learning endpoint returns no error. Validation is not proof of future profit; missing original inputs, sparse scopes, model/data drift and limited source coverage are documented in LEARNING.md. The source archive excludes the owner's database and credentials.

## Publication release checks — 27 September 2026

- 127 automated checks passed, including the full three-migration D1 schema chain, background task retention, ticket sorting/search/status counts and the existing learning/settlement/PWA checks.
- Mobile at 390 × 844: header and bottom navigation both fixed; header top remained zero after scrolling. No horizontal overflow. Model Lab moved to header; Tickets replaced its navigation position. Pending filter excluded the owner’s won ticket, with no edits to stored stakes or snapshots.
- Hosted Worker local runtime: HTML, manifest, service worker, API health, learning, history and tickets returned 200. Its isolated public-source flow compiled 476 real fixtures, 15,866 quotes and 779 logged forecasts; 93 fixtures had an independent Arata forecast. Some public provider requests failed, reported as partial coverage. These are verification-time observations, not fixed catalog sizes.
- Private local history and the owner’s two saved tickets remain in the original SQLite database. No test tickets were inserted there. The new pending ticket was created by the owner during the workflow.
- Source ZIP excludes dependencies, generated output, cache databases, credentials and personal ticket history, and includes the lockfile, all app modules and setup/deployment documentation.
