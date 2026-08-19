ALTER TABLE `content_drafts` DROP INDEX `content_drafts_user_created_idx`;--> statement-breakpoint
ALTER TABLE `draft_revisions` DROP INDEX `draft_revisions_draft_created_idx`;--> statement-breakpoint
ALTER TABLE `entitlements` DROP INDEX `entitlements_user_expiry_idx`;--> statement-breakpoint
ALTER TABLE `generation_usages` DROP INDEX `generation_usages_user_created_idx`;--> statement-breakpoint
ALTER TABLE `voucher_redemption_attempts` DROP INDEX `voucher_redemptions_user_created_idx`;--> statement-breakpoint
CREATE INDEX `content_drafts_user_created_idx` ON `content_drafts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `draft_revisions_draft_created_idx` ON `draft_revisions` (`draftId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `entitlements_user_expiry_idx` ON `entitlements` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `generation_usages_user_created_idx` ON `generation_usages` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `voucher_redemptions_user_created_idx` ON `voucher_redemption_attempts` (`userId`,`createdAt`);