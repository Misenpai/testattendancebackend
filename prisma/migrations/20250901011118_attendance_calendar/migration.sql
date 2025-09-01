-- AlterTable
ALTER TABLE `attendance_calendar` ADD COLUMN `absent` TINYINT NOT NULL DEFAULT 1,
    ADD COLUMN `present` TINYINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `attendance_types` ADD COLUMN `takenLocation` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `attendance_calendar_present_idx` ON `attendance_calendar`(`present`);

-- CreateIndex
CREATE INDEX `attendance_calendar_absent_idx` ON `attendance_calendar`(`absent`);
