CREATE TABLE `account_deletion_requests` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','in_review','completed','declined') NOT NULL DEFAULT 'pending',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`resolvedByUserId` int,
	`resolutionNote` varchar(280),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_deletion_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `account_deletion_requests_user_created_idx` ON `account_deletion_requests` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `account_deletion_requests_status_requested_idx` ON `account_deletion_requests` (`status`,`requestedAt`);