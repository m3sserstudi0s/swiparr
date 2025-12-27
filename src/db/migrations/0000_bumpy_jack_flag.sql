CREATE TABLE `Hidden` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jellyfinItemId` text NOT NULL,
	`jellyfinUserId` text NOT NULL,
	`sessionCode` text,
	FOREIGN KEY (`sessionCode`) REFERENCES `Session`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Hidden_jellyfinItemId_jellyfinUserId_sessionCode_key` ON `Hidden` (`jellyfinItemId`,`jellyfinUserId`,`sessionCode`);--> statement-breakpoint
CREATE TABLE `Like` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jellyfinItemId` text NOT NULL,
	`jellyfinUserId` text NOT NULL,
	`isMatch` integer DEFAULT false NOT NULL,
	`sessionCode` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sessionCode`) REFERENCES `Session`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Like_jellyfinItemId_jellyfinUserId_sessionCode_key` ON `Like` (`jellyfinItemId`,`jellyfinUserId`,`sessionCode`);--> statement-breakpoint
CREATE TABLE `SessionMember` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sessionCode` text,
	`jellyfinUserId` text NOT NULL,
	`jellyfinUserName` text NOT NULL,
	`joinedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sessionCode`) REFERENCES `Session`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SessionMember_sessionCode_jellyfinUserId_key` ON `SessionMember` (`sessionCode`,`jellyfinUserId`);--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`hostUserId` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Session_code_key` ON `Session` (`code`);