CREATE TABLE `conversions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`convertedFileName` varchar(255) NOT NULL,
	`originalFileKey` varchar(512) NOT NULL,
	`convertedFileKey` varchar(512) NOT NULL,
	`originalFileUrl` text NOT NULL,
	`convertedFileUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`isPdfNative` int NOT NULL DEFAULT 1,
	`pageCount` int,
	`processingTimeMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversions_id` PRIMARY KEY(`id`)
);
