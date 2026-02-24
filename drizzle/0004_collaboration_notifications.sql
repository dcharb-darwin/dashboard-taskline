CREATE TABLE `project_comments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projectId` int NOT NULL,
  `taskId` int,
  `authorName` text NOT NULL,
  `content` text NOT NULL,
  `mentions` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `project_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_comments` ADD CONSTRAINT `project_comments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `project_comments` ADD CONSTRAINT `project_comments_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE `project_activities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projectId` int NOT NULL,
  `taskId` int,
  `actorName` text NOT NULL,
  `eventType` enum('comment_added','task_status_changed','task_assignment_changed','due_soon','overdue') NOT NULL,
  `summary` text NOT NULL,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `project_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_activities` ADD CONSTRAINT `project_activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `project_activities` ADD CONSTRAINT `project_activities_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `scopeType` enum('user','team') NOT NULL DEFAULT 'team',
  `scopeKey` varchar(128) NOT NULL,
  `inAppEnabled` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `emailEnabled` enum('Yes','No') NOT NULL DEFAULT 'No',
  `slackEnabled` enum('Yes','No') NOT NULL DEFAULT 'No',
  `webhookEnabled` enum('Yes','No') NOT NULL DEFAULT 'No',
  `webhookUrl` text,
  `overdueEnabled` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `dueSoonEnabled` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `assignmentEnabled` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `statusChangeEnabled` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projectId` int NOT NULL,
  `taskId` int,
  `eventType` enum('overdue','due_soon','assignment_changed','status_changed') NOT NULL,
  `title` text NOT NULL,
  `message` text NOT NULL,
  `channels` text NOT NULL,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `notification_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notification_events` ADD CONSTRAINT `notification_events_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `notification_events` ADD CONSTRAINT `notification_events_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;
