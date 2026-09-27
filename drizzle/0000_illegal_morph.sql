CREATE TABLE `api_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fixtures` (
	`id` text PRIMARY KEY NOT NULL,
	`kickoff` text NOT NULL,
	`payload` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fixtures_kickoff_idx` ON `fixtures` (`kickoff`);--> statement-breakpoint
CREATE TABLE `odds_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`fixture_id` text NOT NULL,
	`captured` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`fixture_id`) REFERENCES `fixtures`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `odds_fixture_captured_idx` ON `odds_snapshots` (`fixture_id`,`captured`);--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` text PRIMARY KEY NOT NULL,
	`fixture_id` text NOT NULL,
	`created` text NOT NULL,
	`outcome` text DEFAULT 'pending' NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`fixture_id`) REFERENCES `fixtures`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `predictions_fixture_idx` ON `predictions` (`fixture_id`);--> statement-breakpoint
CREATE TABLE `ticket_legs` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`prediction_id` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prediction_id`) REFERENCES `predictions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `legs_ticket_idx` ON `ticket_legs` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload` text NOT NULL
);
