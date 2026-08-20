CREATE TABLE `document_upload_events` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`documentId` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_upload_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploaded_documents` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`storageKey` varchar(320) NOT NULL,
	`storageUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `document_upload_events_user_created_idx` ON `document_upload_events` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `uploaded_documents_user_created_idx` ON `uploaded_documents` (`userId`,`createdAt`);