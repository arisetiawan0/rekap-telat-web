CREATE TABLE `records` (
	`id` varchar(36) NOT NULL,
	`session_id` varchar(36) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`date` varchar(32) NOT NULL DEFAULT '',
	`shift` varchar(64) NOT NULL DEFAULT '',
	`schedule_in` varchar(16) NOT NULL DEFAULT '',
	`schedule_out` varchar(16) NOT NULL DEFAULT '',
	`check_in` varchar(16) NOT NULL DEFAULT '',
	`check_out` varchar(16) NOT NULL DEFAULT '',
	`late_minutes` int NOT NULL DEFAULT 0,
	`total_late_count` int NOT NULL DEFAULT 0,
	`is_shift_adjusted` boolean NOT NULL DEFAULT false,
	`original_schedule` varchar(32) NOT NULL DEFAULT '',
	`organization` varchar(255) NOT NULL DEFAULT '',
	`job_position` varchar(255) NOT NULL DEFAULT '',
	`job_level` varchar(255) NOT NULL DEFAULT '',
	`employment_status` varchar(255) NOT NULL DEFAULT '',
	CONSTRAINT `records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`processed_at` varchar(32) NOT NULL,
	`total_cases` int NOT NULL DEFAULT 0,
	`total_employees` int NOT NULL DEFAULT 0,
	`total_late_minutes` int NOT NULL DEFAULT 0,
	`avg_late_minutes` double NOT NULL DEFAULT 0,
	`summary_json` json NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `records` ADD CONSTRAINT `records_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_records_session_id` ON `records` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_records_full_name` ON `records` (`full_name`);--> statement-breakpoint
CREATE INDEX `idx_sessions_processed_at` ON `sessions` (`processed_at`);