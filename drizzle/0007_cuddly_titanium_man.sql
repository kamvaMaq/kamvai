CREATE TABLE `prompt_library_favorites` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`templateId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prompt_library_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `prompt_library_favorites_user_template_idx` UNIQUE(`userId`,`templateId`)
);
--> statement-breakpoint
CREATE INDEX `prompt_library_favorites_user_created_idx` ON `prompt_library_favorites` (`userId`,`createdAt`);