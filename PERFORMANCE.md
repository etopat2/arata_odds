# Loading performance

The release removes charts from the initial JavaScript graph. History, Model Lab, saved Tickets and goal-event charts are separate lazy modules; analytical charts download when opened. Before: approximately 814 KB JavaScript / 245 KB gzip. After: approximately 419 KB / 132 KB gzip for the initial entry, a roughly 49% raw / 46% compressed reduction. These are production build sizes, not a measured guarantee of an equivalent speedup on every phone.

The dashboard loads saved state first and refreshes discovery afterward. It avoids overlapping the first saved-state load with a second identical state request. Public prediction, league result and bookmaker discovery calls run in parallel. Non-price coverage probes stop after four seconds; prediction-provider requests stop after six seconds. Failed sources remain visibly unavailable or labelled stale. The model never uses missing evidence as a fabricated estimate.

Fixture-to-prediction joins use an indexed lookup rather than repeated list scans. Ticket search skips expensive generation while another module is open. Metrics reuse a short fifteen-second cache, invalidated by ticket status/stake changes. Offscreen fixture cards use content visibility. Node JSON compression runs asynchronously so large responses do not block the live-score event loop. Compiled hashed assets get an immutable one-year cache; HTML revalidates and the service worker stays uncached. API responses are never cached by the PWA.

Initial hosted-runtime smoke checks returned the HTML in 304 ms, the health endpoint in 75 ms and history in 35 ms on this machine. A live source-backed tickets request took 1.87 seconds. These observations come from a local Worker runtime and are not cloud or mobile benchmarks. A full initial data compilation can still take tens of seconds due to external sources; cached state remains available during subsequent refreshes.

The strict two-second live source check/poll cadence is preserved. Bookmaker odds refresh independently every thirty seconds with a one-minute pre-match source cache. No refresh interval was lengthened to achieve the bundle reduction.
