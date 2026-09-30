# Requirements audit — 26 September 2026 (updated 30 September)

The table below records the original personal MVP audit. The current release adds server-managed administrator/user accounts, forced first-login password changes, per-user ticket collections, a daily guidance workflow, improved Fixtures status filtering, and native browser PWA installation controls. The supported full deployments are Node.js with persistent SQLite/PostgreSQL or the Cloudflare-compatible Worker with D1. InfinityFree's free PHP/MySQL hosting cannot run this backend or its unattended schedule; see [INFINITYFREE.md](INFINITYFREE.md). No prediction or ticket can guarantee a win. Current public feeds may leave daily suggestions empty rather than creating unsupported picks.

The app runs locally at http://localhost:5173. Core features are implemented, but complete automated odds coverage for every requested bookmaker is not available in this release.

| Requirement | Status and scope |
| --- | --- |
| Mobile-first personal React app; no user/payment setup | Implemented. Local React/Vite frontend and Node API; optional Vinext/D1 entry retained. |
| Public fixtures and automatic odds snapshots without personal API keys | Implemented with bounded BetPawa discovery, LiveScore, OpenLigaDB and public 1XBet highlights. Custom APIs normalize and persist data. This is curated public-source compilation, not a general web search engine or complete football census. |
| Apify/Flashscore replacement | Implemented as requested. Apify is disabled because it needs a token. |
| All six requested Uganda bookmakers | Partial. BetPawa has automatic real quotes. 1XBet provides fixtures but its public page omits odds. GSB, SBA, Betway Uganda and Betwinner have no verified accessible automatic Uganda odds feed in the observed environment. Manual quote entry exists; blocked feeds are reported. |
| Today, tomorrow, week, upcoming and specific day | Implemented with Africa/Kampala day boundaries and EAT display. |
| Home/draw/away probability and value >5 percentage points | Implemented from Bet Better. Model availability covers six leagues and may leave matches unmodelled. Exact team, league, date and market joining prevents invented estimates. |
| H2H and recent form | Implemented where OpenLigaDB historical results exist. Coverage is partial. This context does not modify the initial published model. |
| BTTS, over/under, handicap and other markets | Real quotes and exact supported model markets implemented. Double chance is displayed without a fabricated model. Refund/quarter-line markets are excluded from automatic recommendations. |
| Higher confidence / lower risk analysis | Implemented as transparent probability/confidence/edge filters. No safety or profit guarantee; source gaps can leave no qualifying suggestions. |
| Accumulator, combined odds, stake and return | Implemented. Real available selections, locked saved snapshots, one leg per fixture, up to ten legs. Saving records research; it does not place a bet. Automatic generation produces up to six alternatives with exactly 1–10 selected picks, risk profiles and saved advice. |
| Single league, several leagues and auto mix | Implemented. Date and search filters also apply. Auto mixing uses at least two leagues and limits concentration; chance/value ranking exposes the tradeoff. |
| Running tickets and live match display | Implemented. Current in-play quotes, live bubble, score, provider minutes, HT/FT and added time such as 90 + 3'. Explicit source FT settles results; elapsed local time does not. |
| Frequent refresh | Implemented. Live checks target two seconds; SSE pushes each source result independently and fixtures/prices one minute while visible; caching and non-overlapping requests reduce load. Requests time out and delayed scores are labeled. Source/network latency prevents a guarantee of instant score delivery. |
| History, team search, outcome, accuracy, ROI and chart | Implemented. Every immutable snapshot is retained, searchable by either team. Accuracy excludes pending; ROI uses saved-ticket stakes. The trend chart stays empty until real logged predictions settle. Provider settled records remain separate. |
| Multi-layer cache | Implemented: request memoization, in-flight deduplication, bounded memory, database cache, then public API. Redis is unnecessary for this single-user local setup. |
| PostgreSQL/Supabase storage | Optional PostgreSQL adapter and schema implemented; not integration-tested against a running PostgreSQL server. The verified immediate local storage is SQLite. |
| Optional native wrapper | Deferred as allowed by the original request. Installable web manifest/offline screen included. |
| Restartable launch | Implemented and verified. Start-Arata-Odds.cmd opens the app; background supervisor restarts services. Start the launcher again after Windows restarts. |

The zipped prompt pack was read as reference context. Its embedded instructions did not replace the user's requests. No sportsbook credentials, betting account automation or fabricated odds were added.

## Branding and own-model extension

Custom generated transparent logo and matching identity are applied to the app, mobile header, browser icon, install manifest and offline screen. Arata's independent goal model, source evidence, form, H2H, chances and alternate-market probabilities are implemented alongside Bet Better. Ticket/pick predictor selection, a 50/50 blend and prospective Model Lab comparisons with charts are implemented. Automatic selects a leader only after a documented minimum paired sample and paired error intervals.

Public historical CSVs cover six leagues without credentials. Current availability news is headline context; complete injuries, verified lineups and learned player-impact adjustments remain unavailable. Missing evidence is disclosed, not invented. Independent forecasts remain provisional until evaluated on future settled matches. Existing user tickets and snapshots are preserved.

### V2 squad and player-impact extension

- Implemented published squad lists and distinct provider-confirmed starting XI status from ESPN; one-minute refresh near kickoff.
- Connected official MLS absence reports and official PL/FPL availability, with date/freshness gates and source links. Comprehensive medical coverage across every league remains unavailable through the free connected feeds.
- Implemented learned, regularized player/rest coefficients with chronological holdout gates, caps and abstention. Current targets use actual regulation goals, alongside the existing venue/form/H2H baseline.
- Connected licensed StatsBomb shot-xG events, archive inspection/chart and source attribution. Current shot-xG coverage is limited; stale archives cannot influence today's forecasts. No synthetic xG or inferred team totals fill gaps.
- Disabled automated FotMob extraction after verifying its restriction on systematic collection.
- Fixed history scalability: all immutable rows remain saved, search/pagination operate in storage, and ticket/metrics queries no longer deserialize the full archive.

Live preview release: confirmed FT overrides later timestamps on stale Live labels; actual provider IDs and saved result dates are tracked independently of filters. Goal names, minutes, assists and HT score metadata are partial and source-attributed. Team totals, clean sheets, win-to-nil, odd/even and result combinations are available where quoted and exactly modeled; risk floors still apply. Reviewed final result recovery does not claim automatic comprehensive minor-league coverage. Current Live state uses a light path and a short-lived metric cache rather than deserializing the forecast archive.
