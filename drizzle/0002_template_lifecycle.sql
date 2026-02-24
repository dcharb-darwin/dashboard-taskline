ALTER TABLE `templates` ADD `templateGroupKey` varchar(64) NOT NULL DEFAULT 'template';
--> statement-breakpoint
UPDATE `templates` SET `templateGroupKey` = `templateKey` WHERE `templateGroupKey` = 'template';
--> statement-breakpoint
ALTER TABLE `templates` ADD `version` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `templates` ADD `status` enum('Draft','Published','Archived') NOT NULL DEFAULT 'Published';
--> statement-breakpoint
ALTER TABLE `templates` ADD `uploadSource` varchar(32) NOT NULL DEFAULT 'manual';
--> statement-breakpoint
ALTER TABLE `templates` ADD `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;
