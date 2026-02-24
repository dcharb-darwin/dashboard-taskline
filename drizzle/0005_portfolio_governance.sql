CREATE TABLE `audit_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `entityType` enum('project','task','template','integration','webhook','user_access') NOT NULL,
  `entityId` varchar(64) NOT NULL,
  `action` varchar(64) NOT NULL,
  `actorOpenId` varchar(64),
  `actorName` text NOT NULL,
  `details` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` text NOT NULL,
  `endpointUrl` text NOT NULL,
  `events` text NOT NULL,
  `secret` text,
  `isActive` enum('Yes','No') NOT NULL DEFAULT 'Yes',
  `lastTriggeredAt` timestamp,
  `lastStatus` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `webhook_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_access_policies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `accessRole` enum('Admin','Editor','Viewer') NOT NULL DEFAULT 'Editor',
  `updatedBy` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_access_policies_id` PRIMARY KEY(`id`),
  CONSTRAINT `user_access_policies_openId_unique` UNIQUE(`openId`)
);
