CREATE INDEX `Hidden_sessionCode_externalUserId_idx` ON `Hidden` (`sessionCode`,`externalUserId`);--> statement-breakpoint
CREATE INDEX `Hidden_externalUserId_sessionCode_idx` ON `Hidden` (`externalUserId`,`sessionCode`);--> statement-breakpoint
CREATE INDEX `Like_externalUserId_createdAt_idx` ON `Like` (`externalUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Like_sessionCode_externalUserId_idx` ON `Like` (`sessionCode`,`externalUserId`);--> statement-breakpoint
CREATE INDEX `Like_sessionCode_externalId_idx` ON `Like` (`sessionCode`,`externalId`);--> statement-breakpoint
CREATE INDEX `SessionMember_sessionCode_idx` ON `SessionMember` (`sessionCode`);