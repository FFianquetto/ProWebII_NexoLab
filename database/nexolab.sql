-- =============================================================================
-- NexoLab — Script MySQL (creación de BD + tablas + relaciones)
-- Compatible con MySQL 8 / MariaDB (XAMPP)
-- Ejecutar en MySQL Workbench, phpMyAdmin o: mysql -u root < database/nexolab.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `nexolab`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `nexolab`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `reservation_equipment`;
DROP TABLE IF EXISTS `incidents`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `equipment`;
DROP TABLE IF EXISTS `laboratories`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1) users
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name`     VARCHAR(150) NOT NULL,
  `role`          ENUM('ADMIN', 'TEACHER', 'STUDENT') NOT NULL DEFAULT 'STUDENT',
  `student_id`    VARCHAR(50) NULL,
  `phone`         VARCHAR(30) NULL,
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2) subjects
-- -----------------------------------------------------------------------------
CREATE TABLE `subjects` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `code`        VARCHAR(30) NOT NULL,
  `name`        VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `credits`     INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `subjects_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3) laboratories
-- -----------------------------------------------------------------------------
CREATE TABLE `laboratories` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `code`        VARCHAR(30) NOT NULL,
  `name`        VARCHAR(150) NOT NULL,
  `building`    VARCHAR(100) NOT NULL,
  `floor`       VARCHAR(20) NULL,
  `capacity`    INT NOT NULL,
  `status`      ENUM('AVAILABLE', 'MAINTENANCE', 'CLOSED') NOT NULL DEFAULT 'AVAILABLE',
  `description` TEXT NULL,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `laboratories_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4) equipment  (FK → laboratories)
-- -----------------------------------------------------------------------------
CREATE TABLE `equipment` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `inventory_code` VARCHAR(50) NOT NULL,
  `name`           VARCHAR(150) NOT NULL,
  `category`       VARCHAR(80) NOT NULL,
  `status`         ENUM('AVAILABLE', 'IN_USE', 'BROKEN', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
  `laboratory_id`  INT NOT NULL,
  `notes`          TEXT NULL,
  `created_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `equipment_inventory_code_key` (`inventory_code`),
  KEY `equipment_laboratory_id_idx` (`laboratory_id`),
  CONSTRAINT `equipment_laboratory_id_fkey`
    FOREIGN KEY (`laboratory_id`) REFERENCES `laboratories` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5) reservations  (FK → users, laboratories, subjects)
-- -----------------------------------------------------------------------------
CREATE TABLE `reservations` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `user_id`        INT NOT NULL,
  `laboratory_id`  INT NOT NULL,
  `subject_id`     INT NULL,
  `title`          VARCHAR(150) NOT NULL,
  `purpose`        TEXT NULL,
  `starts_at`      DATETIME(3) NOT NULL,
  `ends_at`        DATETIME(3) NOT NULL,
  `attendees`      INT NOT NULL DEFAULT 1,
  `status`         ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
  `created_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `reservations_user_id_idx` (`user_id`),
  KEY `reservations_laboratory_id_idx` (`laboratory_id`),
  KEY `reservations_subject_id_idx` (`subject_id`),
  KEY `reservations_starts_at_ends_at_idx` (`starts_at`, `ends_at`),
  CONSTRAINT `reservations_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `reservations_laboratory_id_fkey`
    FOREIGN KEY (`laboratory_id`) REFERENCES `laboratories` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `reservations_subject_id_fkey`
    FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6) reservation_equipment  (FK → reservations, equipment)
-- -----------------------------------------------------------------------------
CREATE TABLE `reservation_equipment` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `reservation_id` INT NOT NULL,
  `equipment_id`   INT NOT NULL,
  `quantity`       INT NOT NULL DEFAULT 1,
  `created_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reservation_equipment_reservation_id_equipment_id_key` (`reservation_id`, `equipment_id`),
  KEY `reservation_equipment_equipment_id_idx` (`equipment_id`),
  CONSTRAINT `reservation_equipment_reservation_id_fkey`
    FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `reservation_equipment_equipment_id_fkey`
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7) incidents  (FK → laboratories, equipment, users)
-- -----------------------------------------------------------------------------
CREATE TABLE `incidents` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `title`          VARCHAR(150) NOT NULL,
  `description`    TEXT NOT NULL,
  `status`         ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `severity`       ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `laboratory_id`  INT NULL,
  `equipment_id`   INT NULL,
  `reported_by_id` INT NOT NULL,
  `resolved_at`    DATETIME(3) NULL,
  `created_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `incidents_laboratory_id_idx` (`laboratory_id`),
  KEY `incidents_equipment_id_idx` (`equipment_id`),
  KEY `incidents_reported_by_id_idx` (`reported_by_id`),
  CONSTRAINT `incidents_laboratory_id_fkey`
    FOREIGN KEY (`laboratory_id`) REFERENCES `laboratories` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `incidents_equipment_id_fkey`
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `incidents_reported_by_id_fkey`
    FOREIGN KEY (`reported_by_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
