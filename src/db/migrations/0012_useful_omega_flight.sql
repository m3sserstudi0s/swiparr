CREATE TABLE `SessionEvent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sessionCode` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `SessionEvent_sessionCode_idx` ON `SessionEvent` (`sessionCode`);--> statement-breakpoint
CREATE INDEX `SessionEvent_id_sessionCode_idx` ON `SessionEvent` (`id`,`sessionCode`);