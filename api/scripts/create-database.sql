CREATE DATABASE IF NOT EXISTS `safetybox`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `safetybox`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `vault_records` (
  `id` varchar(36) NOT NULL,
  `ownerId` varchar(36) NOT NULL,
  `encryptedPayload` longtext NOT NULL,
  `iv` longtext NULL,
  `salt` varchar(64) NULL,
  `initializationVector` varchar(32) NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;