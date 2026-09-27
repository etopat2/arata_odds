CREATE TABLE `prediction_heads` (
	`fixture_id` text NOT NULL,
	`predictor` text NOT NULL,
	`market` text NOT NULL,
	`selection` text NOT NULL,
	`line_key` text NOT NULL,
	`prediction_id` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`fixture_id`, `predictor`, `market`, `selection`, `line_key`)
);
--> statement-breakpoint
CREATE INDEX `predictions_outcome_created_idx` ON `predictions` (`outcome`,`created`);--> statement-breakpoint
CREATE INDEX `predictions_created_idx` ON `predictions` (`created`);--> statement-breakpoint
CREATE INDEX `predictions_fixture_outcome_idx` ON `predictions` (`fixture_id`,`outcome`);
