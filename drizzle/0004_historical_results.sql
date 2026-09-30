CREATE TABLE IF NOT EXISTS historical_results (id TEXT PRIMARY KEY, league_id TEXT NOT NULL, kickoff TEXT NOT NULL, source TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS historical_results_league_kickoff_idx ON historical_results(league_id,kickoff);
