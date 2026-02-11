DROP INDEX `Hidden_externalId_externalUserId_sessionCode_key`;--> statement-breakpoint
DELETE FROM `Hidden` WHERE id NOT IN (SELECT MIN(id) FROM `Hidden` GROUP BY externalId, externalUserId, COALESCE(sessionCode, 'solo_mode'));--> statement-breakpoint
CREATE UNIQUE INDEX `Hidden_session_key` ON `Hidden` (`externalId`,`externalUserId`,`sessionCode`) WHERE sessionCode IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `Hidden_solo_key` ON `Hidden` (`externalId`,`externalUserId`) WHERE sessionCode IS NULL;--> statement-breakpoint
DROP INDEX `Like_externalId_externalUserId_sessionCode_key`;--> statement-breakpoint
DELETE FROM `Like` WHERE id NOT IN (SELECT MIN(id) FROM `Like` GROUP BY externalId, externalUserId, COALESCE(sessionCode, 'solo_mode'));--> statement-breakpoint
CREATE UNIQUE INDEX `Like_session_key` ON `Like` (`externalId`,`externalUserId`,`sessionCode`) WHERE sessionCode IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `Like_solo_key` ON `Like` (`externalId`,`externalUserId`) WHERE sessionCode IS NULL;