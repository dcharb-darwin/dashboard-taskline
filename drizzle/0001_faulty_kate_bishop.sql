CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`templateId` int,
	`templateType` varchar(64) NOT NULL,
	`projectManager` text,
	`startDate` timestamp,
	`targetCompletionDate` timestamp,
	`budget` int,
	`status` enum('Planning','Active','On Hold','Complete') NOT NULL DEFAULT 'Planning',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taskId` varchar(16) NOT NULL,
	`taskDescription` text NOT NULL,
	`startDate` timestamp,
	`dueDate` timestamp,
	`durationDays` int,
	`dependency` text,
	`owner` text,
	`status` enum('Not Started','In Progress','Complete','On Hold') NOT NULL DEFAULT 'Not Started',
	`priority` enum('High','Medium','Low') NOT NULL DEFAULT 'Medium',
	`phase` text,
	`budget` int,
	`approvalRequired` enum('Yes','No') NOT NULL DEFAULT 'No',
	`approver` text,
	`deliverableType` text,
	`completionPercent` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`templateKey` varchar(64) NOT NULL,
	`description` text,
	`phases` text NOT NULL,
	`sampleTasks` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_templateKey_unique` UNIQUE(`templateKey`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_templateId_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;