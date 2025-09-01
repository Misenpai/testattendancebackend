/*
  Warnings:

  - The primary key for the `attendance_audio` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `attendanceRef` on the `attendance_audio` table. All the data in the column will be lost.
  - You are about to drop the column `audioKey` on the `attendance_audio` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `attendance_audio` table. All the data in the column will be lost.
  - The primary key for the `attendance_calendar` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `calendarKey` on the `attendance_calendar` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `attendance_calendar` table. All the data in the column will be lost.
  - You are about to drop the column `daysMask` on the `attendance_calendar` table. All the data in the column will be lost.
  - You are about to drop the column `empCode` on the `attendance_calendar` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `attendance_calendar` table. All the data in the column will be lost.
  - You are about to drop the column `totalFullDays` on the `attendance_calendar` table. All the data in the column will be lost.
  - You are about to drop the column `totalHalfDays` on the `attendance_calendar` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `attendance_calendar` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `attendance_calendar` table. All the data in the column will be lost.
  - The primary key for the `attendance_photos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `attendanceRef` on the `attendance_photos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `attendance_photos` table. All the data in the column will be lost.
  - You are about to drop the column `photoKey` on the `attendance_photos` table. All the data in the column will be lost.
  - The primary key for the `field_trips` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `field_trips` table. All the data in the column will be lost.
  - You are about to drop the column `empCode` on the `field_trips` table. All the data in the column will be lost.
  - You are about to drop the column `tripKey` on the `field_trips` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `field_trips` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `empCode` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `userKey` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attendance_dates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_locations` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[attendanceRecordKey]` on the table `attendance_calendar` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `attendanceRecordKey` to the `attendance_audio` table without a default value. This is not possible if the table is not empty.
  - The required column `audioRecordKey` was added to the `attendance_audio` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `attendanceRecordKey` to the `attendance_calendar` table without a default value. This is not possible if the table is not empty.
  - The required column `calendarEntryKey` was added to the `attendance_calendar` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `day` to the `attendance_calendar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attendanceRecordKey` to the `attendance_photos` table without a default value. This is not possible if the table is not empty.
  - The required column `photoRecordKey` was added to the `attendance_photos` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `employeeNumber` to the `field_trips` table without a default value. This is not possible if the table is not empty.
  - The required column `fieldTripKey` was added to the `field_trips` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `username` to the `field_trips` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employeeNumber` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `attendance_empCode_fkey`;

-- DropForeignKey
ALTER TABLE `attendance_audio` DROP FOREIGN KEY `attendance_audio_attendanceRef_fkey`;

-- DropForeignKey
ALTER TABLE `attendance_dates` DROP FOREIGN KEY `attendance_dates_attendanceRef_fkey`;

-- DropForeignKey
ALTER TABLE `attendance_dates` DROP FOREIGN KEY `attendance_dates_empCode_fkey`;

-- DropForeignKey
ALTER TABLE `attendance_photos` DROP FOREIGN KEY `attendance_photos_attendanceRef_fkey`;

-- DropForeignKey
ALTER TABLE `field_trips` DROP FOREIGN KEY `field_trips_empCode_fkey`;

-- DropForeignKey
ALTER TABLE `user_locations` DROP FOREIGN KEY `user_locations_empCode_fkey`;

-- DropIndex
DROP INDEX `attendance_audio_attendanceRef_idx` ON `attendance_audio`;

-- DropIndex
DROP INDEX `attendance_calendar_empCode_idx` ON `attendance_calendar`;

-- DropIndex
DROP INDEX `attendance_calendar_empCode_year_month_key` ON `attendance_calendar`;

-- DropIndex
DROP INDEX `attendance_calendar_year_month_idx` ON `attendance_calendar`;

-- DropIndex
DROP INDEX `attendance_photos_attendanceRef_idx` ON `attendance_photos`;

-- DropIndex
DROP INDEX `field_trips_empCode_idx` ON `field_trips`;

-- DropIndex
DROP INDEX `users_email_key` ON `users`;

-- DropIndex
DROP INDEX `users_empCode_idx` ON `users`;

-- DropIndex
DROP INDEX `users_empCode_key` ON `users`;

-- DropIndex
DROP INDEX `users_isActive_idx` ON `users`;

-- DropIndex
DROP INDEX `users_role_idx` ON `users`;

-- AlterTable
ALTER TABLE `attendance_audio` DROP PRIMARY KEY,
    DROP COLUMN `attendanceRef`,
    DROP COLUMN `audioKey`,
    DROP COLUMN `createdAt`,
    ADD COLUMN `attendanceRecordKey` VARCHAR(191) NOT NULL,
    ADD COLUMN `audioRecordKey` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`audioRecordKey`);

-- AlterTable
ALTER TABLE `attendance_calendar` DROP PRIMARY KEY,
    DROP COLUMN `calendarKey`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `daysMask`,
    DROP COLUMN `empCode`,
    DROP COLUMN `month`,
    DROP COLUMN `totalFullDays`,
    DROP COLUMN `totalHalfDays`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `year`,
    ADD COLUMN `attendanceRecordKey` VARCHAR(191) NOT NULL,
    ADD COLUMN `calendarEntryKey` VARCHAR(191) NOT NULL,
    ADD COLUMN `day` DATE NOT NULL,
    ADD PRIMARY KEY (`calendarEntryKey`);

-- AlterTable
ALTER TABLE `attendance_photos` DROP PRIMARY KEY,
    DROP COLUMN `attendanceRef`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `photoKey`,
    ADD COLUMN `attendanceRecordKey` VARCHAR(191) NOT NULL,
    ADD COLUMN `photoRecordKey` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`photoRecordKey`);

-- AlterTable
ALTER TABLE `field_trips` DROP PRIMARY KEY,
    DROP COLUMN `createdAt`,
    DROP COLUMN `empCode`,
    DROP COLUMN `tripKey`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `employeeNumber` VARCHAR(255) NOT NULL,
    ADD COLUMN `fieldTripKey` VARCHAR(191) NOT NULL,
    ADD COLUMN `username` VARCHAR(255) NOT NULL,
    ADD PRIMARY KEY (`fieldTripKey`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    DROP COLUMN `createdAt`,
    DROP COLUMN `email`,
    DROP COLUMN `empCode`,
    DROP COLUMN `isActive`,
    DROP COLUMN `location`,
    DROP COLUMN `password`,
    DROP COLUMN `role`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userKey`,
    ADD COLUMN `dateOfResign` DATE NULL,
    ADD COLUMN `empClass` VARCHAR(10) NOT NULL DEFAULT 'PJ',
    ADD COLUMN `employeeNumber` VARCHAR(255) NOT NULL,
    ADD PRIMARY KEY (`employeeNumber`);

-- DropTable
DROP TABLE `attendance`;

-- DropTable
DROP TABLE `attendance_dates`;

-- DropTable
DROP TABLE `user_locations`;

-- CreateTable
CREATE TABLE `projects` (
    `projectCode` VARCHAR(255) NOT NULL,
    `department` VARCHAR(255) NOT NULL,

    INDEX `projects_department_idx`(`department`),
    PRIMARY KEY (`projectCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_project_relations` (
    `relationKey` VARCHAR(191) NOT NULL,
    `employeeNumber` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `projectCode` VARCHAR(255) NOT NULL,

    INDEX `user_project_relations_employeeNumber_idx`(`employeeNumber`),
    INDEX `user_project_relations_projectCode_idx`(`projectCode`),
    INDEX `user_project_relations_username_idx`(`username`),
    UNIQUE INDEX `user_project_relations_employeeNumber_projectCode_key`(`employeeNumber`, `projectCode`),
    PRIMARY KEY (`relationKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pis` (
    `principalInvestigatorKey` VARCHAR(191) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `projectCode` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `pis_username_key`(`username`),
    INDEX `pis_projectCode_idx`(`projectCode`),
    INDEX `pis_username_idx`(`username`),
    PRIMARY KEY (`principalInvestigatorKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pi_project_relations` (
    `relationKey` VARCHAR(191) NOT NULL,
    `principalInvestigatorKey` VARCHAR(255) NOT NULL,
    `projectCode` VARCHAR(255) NOT NULL,

    INDEX `pi_project_relations_principalInvestigatorKey_idx`(`principalInvestigatorKey`),
    INDEX `pi_project_relations_projectCode_idx`(`projectCode`),
    UNIQUE INDEX `pi_project_relations_principalInvestigatorKey_projectCode_key`(`principalInvestigatorKey`, `projectCode`),
    PRIMARY KEY (`relationKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `attendanceRecordKey` VARCHAR(191) NOT NULL,
    `employeeNumber` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `attendanceGiven` BOOLEAN NOT NULL DEFAULT false,
    `locationType` ENUM('ABSOLUTE', 'APPROX', 'FIELDTRIP') NOT NULL DEFAULT 'APPROX',

    INDEX `attendances_employeeNumber_idx`(`employeeNumber`),
    INDEX `attendances_username_idx`(`username`),
    INDEX `attendances_attendanceGiven_idx`(`attendanceGiven`),
    INDEX `attendances_locationType_idx`(`locationType`),
    PRIMARY KEY (`attendanceRecordKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location_attendances` (
    `locationRecordKey` VARCHAR(191) NOT NULL,
    `attendanceRecordKey` VARCHAR(191) NOT NULL,
    `latitude` FLOAT NULL,
    `longitude` FLOAT NULL,
    `county` VARCHAR(255) NULL,
    `state` VARCHAR(255) NULL,
    `postcode` VARCHAR(20) NULL,

    UNIQUE INDEX `location_attendances_attendanceRecordKey_key`(`attendanceRecordKey`),
    INDEX `location_attendances_latitude_longitude_idx`(`latitude`, `longitude`),
    INDEX `location_attendances_attendanceRecordKey_idx`(`attendanceRecordKey`),
    PRIMARY KEY (`locationRecordKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_types` (
    `attendanceTypeKey` VARCHAR(191) NOT NULL,
    `attendanceRecordKey` VARCHAR(191) NOT NULL,
    `halfDay` BOOLEAN NOT NULL DEFAULT false,
    `fullDay` BOOLEAN NOT NULL DEFAULT false,
    `isCheckout` BOOLEAN NOT NULL DEFAULT false,
    `attendanceGivenTime` ENUM('FN', 'AF') NULL,
    `checkoutTime` DATETIME(3) NULL,
    `checkinTime` DATETIME(3) NULL,

    UNIQUE INDEX `attendance_types_attendanceRecordKey_key`(`attendanceRecordKey`),
    INDEX `attendance_types_halfDay_idx`(`halfDay`),
    INDEX `attendance_types_fullDay_idx`(`fullDay`),
    INDEX `attendance_types_isCheckout_idx`(`isCheckout`),
    INDEX `attendance_types_attendanceGivenTime_idx`(`attendanceGivenTime`),
    INDEX `attendance_types_attendanceRecordKey_idx`(`attendanceRecordKey`),
    PRIMARY KEY (`attendanceTypeKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar` (
    `calendarKey` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `description` VARCHAR(255) NULL,
    `isHoliday` BOOLEAN NOT NULL DEFAULT true,
    `isWeekend` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `calendar_date_key`(`date`),
    INDEX `calendar_date_idx`(`date`),
    INDEX `calendar_isHoliday_idx`(`isHoliday`),
    INDEX `calendar_isWeekend_idx`(`isWeekend`),
    PRIMARY KEY (`calendarKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `attendance_audio_attendanceRecordKey_idx` ON `attendance_audio`(`attendanceRecordKey`);

-- CreateIndex
CREATE UNIQUE INDEX `attendance_calendar_attendanceRecordKey_key` ON `attendance_calendar`(`attendanceRecordKey`);

-- CreateIndex
CREATE INDEX `attendance_calendar_day_idx` ON `attendance_calendar`(`day`);

-- CreateIndex
CREATE INDEX `attendance_calendar_attendanceRecordKey_idx` ON `attendance_calendar`(`attendanceRecordKey`);

-- CreateIndex
CREATE INDEX `attendance_photos_attendanceRecordKey_idx` ON `attendance_photos`(`attendanceRecordKey`);

-- CreateIndex
CREATE INDEX `field_trips_employeeNumber_idx` ON `field_trips`(`employeeNumber`);

-- CreateIndex
CREATE INDEX `field_trips_username_idx` ON `field_trips`(`username`);

-- CreateIndex
CREATE INDEX `users_username_idx` ON `users`(`username`);

-- CreateIndex
CREATE INDEX `users_empClass_idx` ON `users`(`empClass`);

-- AddForeignKey
ALTER TABLE `user_project_relations` ADD CONSTRAINT `user_project_relations_employeeNumber_fkey` FOREIGN KEY (`employeeNumber`) REFERENCES `users`(`employeeNumber`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_project_relations` ADD CONSTRAINT `user_project_relations_projectCode_fkey` FOREIGN KEY (`projectCode`) REFERENCES `projects`(`projectCode`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pis` ADD CONSTRAINT `pis_projectCode_fkey` FOREIGN KEY (`projectCode`) REFERENCES `projects`(`projectCode`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pi_project_relations` ADD CONSTRAINT `pi_project_relations_principalInvestigatorKey_fkey` FOREIGN KEY (`principalInvestigatorKey`) REFERENCES `pis`(`principalInvestigatorKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pi_project_relations` ADD CONSTRAINT `pi_project_relations_projectCode_fkey` FOREIGN KEY (`projectCode`) REFERENCES `projects`(`projectCode`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_employeeNumber_fkey` FOREIGN KEY (`employeeNumber`) REFERENCES `users`(`employeeNumber`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_calendar` ADD CONSTRAINT `attendance_calendar_attendanceRecordKey_fkey` FOREIGN KEY (`attendanceRecordKey`) REFERENCES `attendances`(`attendanceRecordKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_attendances` ADD CONSTRAINT `location_attendances_attendanceRecordKey_fkey` FOREIGN KEY (`attendanceRecordKey`) REFERENCES `attendances`(`attendanceRecordKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_types` ADD CONSTRAINT `attendance_types_attendanceRecordKey_fkey` FOREIGN KEY (`attendanceRecordKey`) REFERENCES `attendances`(`attendanceRecordKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_photos` ADD CONSTRAINT `attendance_photos_attendanceRecordKey_fkey` FOREIGN KEY (`attendanceRecordKey`) REFERENCES `attendances`(`attendanceRecordKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_audio` ADD CONSTRAINT `attendance_audio_attendanceRecordKey_fkey` FOREIGN KEY (`attendanceRecordKey`) REFERENCES `attendances`(`attendanceRecordKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_trips` ADD CONSTRAINT `field_trips_employeeNumber_fkey` FOREIGN KEY (`employeeNumber`) REFERENCES `users`(`employeeNumber`) ON DELETE CASCADE ON UPDATE CASCADE;
