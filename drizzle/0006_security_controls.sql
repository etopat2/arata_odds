ALTER TABLE auth_users ADD COLUMN max_sessions INTEGER;
--> statement-breakpoint
ALTER TABLE auth_sessions ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE auth_sessions ADD COLUMN device_label TEXT NOT NULL DEFAULT 'Earlier session';
--> statement-breakpoint
ALTER TABLE auth_sessions ADD COLUMN ip_hash TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
DELETE FROM auth_sessions WHERE token_hash IN (SELECT token_hash FROM (SELECT token_hash,ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created DESC) AS position FROM auth_sessions) ranked WHERE position>1);
