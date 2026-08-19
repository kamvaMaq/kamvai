CREATE TABLE `payshap_payment_requests` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('weekly','monthly') NOT NULL,
	`paymentReference` varchar(40) NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('pending','confirmed','rejected','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`reconciledAt` timestamp,
	`reconciledByUserId` int,
	`reconciliationNote` varchar(280),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payshap_payment_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `payshap_payment_requests_paymentReference_unique` UNIQUE(`paymentReference`)
);
--> statement-breakpoint
CREATE INDEX `payshap_requests_user_created_idx` ON `payshap_payment_requests` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payshap_requests_status_created_idx` ON `payshap_payment_requests` (`status`,`createdAt`);