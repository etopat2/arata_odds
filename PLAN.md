# Arata Odds implementation plan

The user's request controls scope. The attached pack is reference material, not authorization to add bookmaker accounts, chat, payments, paid APIs, or confirmation gates. Its percentage expected-return formula differs from the requested probability edge: keep both distinct.

## Flow
Public OpenLigaDB fixtures/results → normalized fixtures → request memoization → isolate memory cache → persistent response cache → upstream HTTP.
Public BetPawa Uganda JSON and 1XBet public embedded fixture data → curated web search/discovery → normalized fixtures with Kampala schedules and source provenance.
Public Bet Better football picks → exact normalized team pair + league + kickoff matching → individual 1X2, BTTS, half-goal totals and Asian-handicap probabilities → immutable prediction snapshots.
Public BetPawa quotes and owner-entered prices → exact full-time market/selection/line snapshots → implied probability = 1/odds → edge = model probability − implied probability → value when edge > .05.
Selections → one leg per fixture → combined decimal odds and return → persisted ticket with locked leg prices.
Confirmed regulation-time results → settle predictions and ticket legs → accuracy and stake-weighted ticket ROI → history and Recharts trend.

## Components
AppShell, DateRangeTabs, SummaryStats, FixtureCard, ProbabilityGrid, OddsEditor, PickCard, TicketBuilder, CombinationSuggestions, HistoryTable, AccuracyChart, SourceStatus.

## Source findings
- João Brito's Flashscore actor is pay-per-event and requires APIFY_TOKEN. It stays disabled; no paid runs or credential requests are part of this MVP.
- Bet Better is keyless, CC BY 4.0, and excludes bookmaker prices. It may publish only one selection, may omit draw, and its provider fairOdds can differ from 1/p. Preserve the provider fair odds and show mathematical fair odds separately.
- OpenLigaDB is keyless community data, ODbL. Its coverage is limited. Empty fixture dates are valid. No fabricated fixtures, odds, predictions, history or profitability.
- The local preview uses SQLite/D1. A portable Node backend supports SQLite by default and PostgreSQL/Supabase through a database connection string. No hosted deployment has been completed.
- Other requested bookmakers are represented in coverage reports and manual quote selection. Their public odds were unavailable or inaccessible in testing; South African redirect prices are excluded.

## Order and acceptance
1. Normalize ingestion, historical H2H and form, cache failures and provenance.
2. Persist model selections and price snapshots; show missing and stale data explicitly.
3. Ticket validation and bounded exhaustive combination ranking by aggregate expected return under an independence assumption.
4. Immutable history, settlement, settled-only accuracy, actual-ticket ROI and trends.
5. Test math, market settlement and adapters against downloaded real responses, run database/API flow, build and package source. A future deployment must remain private.

Automation refreshes while the app is open (15 minutes). No background scheduler is implied. Today and tomorrow use Africa/Kampala by default; this week means today plus six days. Upcoming includes the next 30 days to make gaps discoverable.


## Live matches and league ticket extension

Public LiveScore date/live feed + BetPawa in-play feed → normalized status/score/provider clock → serialized fixture commit → final-result settlement → lightweight live delta → fixture cards and saved ticket progress. Live checks every 10 seconds when visible; day results and pre-match price checks each minute. Full-state/history fetches are separate from live deltas. Source delays and stale records remain visible.

DateWindow + instant keyword filter + LeagueChooser → available quote board and bounded model combination search → selected draft legs → server revalidation → locked tickets. LeagueChooser supports one/multiple/all leagues, optional distinct-league auto mix, chance/value ranking and 2–3 leg limits. Quote-only and live legs have no invented probabilities. Shared teams and duplicate fixtures are excluded from suggestions. History searches immutable snapshots by team names.
