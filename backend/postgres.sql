-- Compatible PostgreSQL and SQLite portable schema.
CREATE TABLE IF NOT EXISTS fixtures (id TEXT PRIMARY KEY, kickoff TEXT NOT NULL, payload TEXT NOT NULL, updated TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS fixtures_kickoff_idx ON fixtures(kickoff);
CREATE TABLE IF NOT EXISTS predictions (id TEXT PRIMARY KEY, fixture_id TEXT NOT NULL REFERENCES fixtures(id), created TEXT NOT NULL, outcome TEXT NOT NULL DEFAULT 'pending' CHECK(outcome IN ('pending','won','lost')), payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS predictions_fixture_idx ON predictions(fixture_id);
CREATE INDEX IF NOT EXISTS predictions_outcome_created_idx ON predictions(outcome,created);
CREATE INDEX IF NOT EXISTS predictions_created_idx ON predictions(created);
CREATE TABLE IF NOT EXISTS odds_snapshots (id TEXT PRIMARY KEY, fixture_id TEXT NOT NULL REFERENCES fixtures(id), captured TEXT NOT NULL, payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS odds_fixture_captured_idx ON odds_snapshots(fixture_id,captured);
CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, created TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','won','lost')), payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ticket_legs (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES tickets(id), prediction_id TEXT NOT NULL REFERENCES predictions(id), payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS legs_ticket_idx ON ticket_legs(ticket_id);
CREATE TABLE IF NOT EXISTS api_cache (key TEXT PRIMARY KEY, expires BIGINT NOT NULL, payload TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS ticket_quote_legs (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES tickets(id), fixture_id TEXT NOT NULL REFERENCES fixtures(id), payload TEXT NOT NULL);

CREATE INDEX IF NOT EXISTS predictions_fixture_outcome_idx ON predictions(fixture_id,outcome);

CREATE TABLE IF NOT EXISTS prediction_heads (fixture_id TEXT NOT NULL, predictor TEXT NOT NULL, market TEXT NOT NULL, selection TEXT NOT NULL, line_key TEXT NOT NULL, prediction_id TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(fixture_id,predictor,market,selection,line_key));
