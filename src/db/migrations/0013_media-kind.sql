DROP INDEX `Hidden_session_key`;--> statement-breakpoint
DROP INDEX `Hidden_solo_key`;--> statement-breakpoint
ALTER TABLE `Hidden` ADD `kind` text DEFAULT 'movie' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `Hidden_session_key` ON `Hidden` (`externalId`,`externalUserId`,`sessionCode`,`kind`) WHERE sessionCode IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `Hidden_solo_key` ON `Hidden` (`externalId`,`externalUserId`,`kind`) WHERE sessionCode IS NULL;--> statement-breakpoint
DROP INDEX `Like_session_key`;--> statement-breakpoint
DROP INDEX `Like_solo_key`;--> statement-breakpoint
ALTER TABLE `Like` ADD `kind` text DEFAULT 'movie' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `Like_session_key` ON `Like` (`externalId`,`externalUserId`,`sessionCode`,`kind`) WHERE sessionCode IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `Like_solo_key` ON `Like` (`externalId`,`externalUserId`,`kind`) WHERE sessionCode IS NULL;