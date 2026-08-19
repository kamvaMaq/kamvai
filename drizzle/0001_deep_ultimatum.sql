CREATE TABLE `content_drafts` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('blog','email','code','image') NOT NULL,
	`title` varchar(160) NOT NULL,
	`prompt` text NOT NULL,
	`language` varchar(32) NOT NULL DEFAULT 'en',
	`body` text,
	`imageUrl` text,
	`publicSlug` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_drafts_publicSlug_unique` UNIQUE(`publicSlug`),
	CONSTRAINT `content_drafts_user_created_idx` UNIQUE(`userId`,`createdAt`)
);
--> statement-breakpoint
CREATE TABLE `draft_revisions` (
	`id` varchar(32) NOT NULL,
	`draftId` varchar(32) NOT NULL,
	`instruction` text NOT NULL,
	`body` text,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `draft_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `draft_revisions_draft_created_idx` UNIQUE(`draftId`,`createdAt`)
);
--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('weekly','monthly') NOT NULL,
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	`startedAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`provider` varchar(64),
	`providerReference` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `entitlements_user_expiry_idx` UNIQUE(`userId`,`expiresAt`)
);
--> statement-breakpoint
CREATE TABLE `generation_usages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('blog','email','code','image') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generation_usages_id` PRIMARY KEY(`id`),
	CONSTRAINT `generation_usages_user_created_idx` UNIQUE(`userId`,`createdAt`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`theme` enum('system','light','dark') NOT NULL DEFAULT 'system',
	`locale` varchar(16) NOT NULL DEFAULT 'en',
	`privacyConsentVersion` varchar(32),
	`privacyConsentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_id_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `voucher_redemption_attempts` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('weekly','monthly') NOT NULL,
	`voucherBrand` enum('kazang','oneforyou','blue','ott') NOT NULL,
	`maskedVoucherCode` varchar(32) NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('pending','confirmed','failed') NOT NULL DEFAULT 'pending',
	`provider` varchar(64),
	`providerReference` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voucher_redemption_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `voucher_redemptions_user_created_idx` UNIQUE(`userId`,`createdAt`)
);
