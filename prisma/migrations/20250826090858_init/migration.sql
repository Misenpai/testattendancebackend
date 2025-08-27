-- AlterTable
ALTER TABLE `attendance` ADD COLUMN `latitude` FLOAT NULL,
    ADD COLUMN `longitude` FLOAT NULL;

-- CreateIndex
CREATE INDEX `attendance_isCheckedOut_idx` ON `attendance`(`isCheckedOut`);
