CREATE TABLE `prompt_library_items` (
	`id` varchar(32) NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` text NOT NULL,
	`kind` enum('blog','email','code','image') NOT NULL,
	`category` varchar(64) NOT NULL,
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompt_library_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `prompt_library_favorites` RENAME COLUMN `templateId` TO `promptId`;--> statement-breakpoint
ALTER TABLE `prompt_library_favorites` DROP INDEX `prompt_library_favorites_user_template_idx`;--> statement-breakpoint
ALTER TABLE `prompt_library_favorites` ADD CONSTRAINT `prompt_library_favorites_user_prompt_idx` UNIQUE(`userId`,`promptId`);--> statement-breakpoint
CREATE INDEX `prompt_library_items_visibility_created_idx` ON `prompt_library_items` (`isBuiltIn`,`createdAt`);--> statement-breakpoint
CREATE INDEX `prompt_library_items_creator_created_idx` ON `prompt_library_items` (`createdByUserId`,`createdAt`);
