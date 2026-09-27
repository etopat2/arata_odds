CREATE TABLE IF NOT EXISTS ticket_quote_legs (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES tickets(id), fixture_id TEXT NOT NULL REFERENCES fixtures(id), payload TEXT NOT NULL);
