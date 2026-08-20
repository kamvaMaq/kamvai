CREATE TABLE `prompt_library_item_tags` (
	`id` varchar(32) NOT NULL,
	`promptId` varchar(32) NOT NULL,
	`tagId` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prompt_library_item_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `prompt_library_item_tags_prompt_tag_idx` UNIQUE(`promptId`,`tagId`)
);
--> statement-breakpoint
CREATE TABLE `prompt_library_tags` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prompt_library_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `prompt_library_tags_user_name_idx` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `prompt_library_items` ADD `publicSlug` varchar(40);--> statement-breakpoint
ALTER TABLE `prompt_library_items` ADD CONSTRAINT `prompt_library_items_publicSlug_unique` UNIQUE(`publicSlug`);--> statement-breakpoint
CREATE INDEX `prompt_library_item_tags_prompt_created_idx` ON `prompt_library_item_tags` (`promptId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `prompt_library_item_tags_tag_created_idx` ON `prompt_library_item_tags` (`tagId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `prompt_library_tags_user_created_idx` ON `prompt_library_tags` (`userId`,`createdAt`);