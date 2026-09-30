CREATE TABLE IF NOT EXISTS auth_users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', role TEXT NOT NULL CHECK(role IN ('admin','user')), active INTEGER NOT NULL DEFAULT 1, must_change_password INTEGER NOT NULL DEFAULT 1, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL, deleted_at TEXT);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_users(id), created INTEGER NOT NULL, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires);
