CREATE TABLE `PendingRequest` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`itemId` text NOT NULL,
	`itemName` text,
	`mediaType` text NOT NULL,
	`tmdbId` integer NOT NULL,
	`requestedBy` text NOT NULL,
	`requestedByName` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolvedAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
