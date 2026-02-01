ALTER TABLE `Hidden` RENAME COLUMN "jellyfinItemId" TO "externalId";--> statement-breakpoint
ALTER TABLE `Hidden` RENAME COLUMN "jellyfinUserId" TO "externalUserId";--> statement-breakpoint
ALTER TABLE `Like` RENAME COLUMN "jellyfinItemId" TO "externalId";--> statement-breakpoint
ALTER TABLE `Like` RENAME COLUMN "jellyfinUserId" TO "externalUserId";--> statement-breakpoint
ALTER TABLE `SessionMember` RENAME COLUMN "jellyfinUserId" TO "externalUserId";--> statement-breakpoint
ALTER TABLE `SessionMember` RENAME COLUMN "jellyfinUserName" TO "externalUserName";--> statement-breakpoint
DROP INDEX `Hidden_jellyfinItemId_jellyfinUserId_sessionCode_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `Hidden_externalId_externalUserId_sessionCode_key` ON `Hidden` (`externalId`,`externalUserId`,`sessionCode`);--> statement-breakpoint
DROP INDEX `Like_jellyfinItemId_jellyfinUserId_sessionCode_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `Like_externalId_externalUserId_sessionCode_key` ON `Like` (`externalId`,`externalUserId`,`sessionCode`);--> statement-breakpoint
DROP INDEX `SessionMember_sessionCode_jellyfinUserId_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `SessionMember_sessionCode_externalUserId_key` ON `SessionMember` (`sessionCode`,`externalUserId`);