CREATE TABLE `prompt_library_share_views` (
	`id` varchar(32) NOT NULL,
	`promptId` varchar(32) NOT NULL,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prompt_library_share_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `prompt_library_share_views_prompt_viewed_idx` ON `prompt_library_share_views` (`promptId`,`viewedAt`);