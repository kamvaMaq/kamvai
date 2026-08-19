CREATE TABLE `email_auth_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_auth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_auth_accounts_email_unique` UNIQUE(`email`),
	CONSTRAINT `email_auth_accounts_user_id_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `email_otp_challenges` (
	`id` varchar(32) NOT NULL,
	`email` varchar(320) NOT NULL,
	`purpose` enum('signup','login') NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`firstName` varchar(120),
	`pendingPasswordHash` varchar(255),
	`attempts` int NOT NULL DEFAULT 0,
	`status` enum('pending','verified','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_otp_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `email_otp_challenges_email_created_idx` ON `email_otp_challenges` (`email`,`createdAt`);