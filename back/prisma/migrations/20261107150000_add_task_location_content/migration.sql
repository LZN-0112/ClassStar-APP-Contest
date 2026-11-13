-- AlterTable
ALTER TABLE `tasks`
    ADD COLUMN `location` VARCHAR(200) NULL,
    ADD COLUMN `content` TEXT NULL;