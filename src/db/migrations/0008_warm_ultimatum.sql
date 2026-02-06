CREATE TABLE `UserProfile` (
	`userId` text PRIMARY KEY NOT NULL,
	`image` blob,
	`contentType` text,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
