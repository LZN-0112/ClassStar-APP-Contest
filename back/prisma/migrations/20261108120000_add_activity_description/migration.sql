-- AlterTable
ALTER TABLE `activities`
    ADD COLUMN `description` TEXT NULL;

-- Rollback:
-- ALTER TABLE `activities` DROP COLUMN `description`;