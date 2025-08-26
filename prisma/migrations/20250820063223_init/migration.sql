-- CreateTable
CREATE TABLE `users` (
    `userKey` VARCHAR(191) NOT NULL,
    `empCode` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `location` VARCHAR(255) NOT NULL DEFAULT 'all',
    `role` ENUM('USER', 'SYSTEM') NOT NULL DEFAULT 'USER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_empCode_key`(`empCode`),
    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_isActive_idx`(`isActive`),
    INDEX `users_empCode_idx`(`empCode`),
    PRIMARY KEY (`userKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_locations` (
    `locationKey` VARCHAR(191) NOT NULL,
    `empCode` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `locationType` ENUM('ABSOLUTE', 'APPROX', 'FIELDTRIP') NOT NULL DEFAULT 'ABSOLUTE',
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approxLat` FLOAT NULL,
    `approxLng` FLOAT NULL,
    `approxRadius` INTEGER NULL DEFAULT 100,

    UNIQUE INDEX `user_locations_empCode_key`(`empCode`),
    INDEX `user_locations_locationType_idx`(`locationType`),
    PRIMARY KEY (`locationKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `attendanceKey` VARCHAR(191) NOT NULL,
    `empCode` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `takenLocation` VARCHAR(255) NULL,
    `date` DATE NOT NULL,
    `checkInTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `checkOutTime` DATETIME(3) NULL,
    `sessionType` ENUM('FORENOON', 'AFTERNOON') NOT NULL,
    `attendanceType` ENUM('FULL_DAY', 'HALF_DAY') NULL,
    `isCheckedOut` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_date_idx`(`date`),
    INDEX `attendance_empCode_date_idx`(`empCode`, `date`),
    INDEX `attendance_empCode_idx`(`empCode`),
    INDEX `attendance_sessionType_idx`(`sessionType`),
    INDEX `attendance_attendanceType_idx`(`attendanceType`),
    UNIQUE INDEX `attendance_empCode_date_key`(`empCode`, `date`),
    PRIMARY KEY (`attendanceKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_dates` (
    `dateKey` VARCHAR(191) NOT NULL,
    `empCode` VARCHAR(255) NOT NULL,
    `date` DATE NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `day` INTEGER NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `weekOfYear` INTEGER NOT NULL,
    `isPresent` BOOLEAN NOT NULL DEFAULT true,
    `attendanceType` ENUM('FULL_DAY', 'HALF_DAY') NULL,
    `attendanceRef` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `attendance_dates_attendanceRef_key`(`attendanceRef`),
    INDEX `attendance_dates_empCode_year_month_idx`(`empCode`, `year`, `month`),
    INDEX `attendance_dates_empCode_date_idx`(`empCode`, `date`),
    INDEX `attendance_dates_year_month_idx`(`year`, `month`),
    INDEX `attendance_dates_empCode_idx`(`empCode`),
    UNIQUE INDEX `attendance_dates_empCode_date_key`(`empCode`, `date`),
    PRIMARY KEY (`dateKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_photos` (
    `photoKey` VARCHAR(191) NOT NULL,
    `attendanceRef` VARCHAR(191) NOT NULL,
    `photoUrl` VARCHAR(500) NOT NULL,
    `photoType` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_photos_attendanceRef_idx`(`attendanceRef`),
    PRIMARY KEY (`photoKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_audio` (
    `audioKey` VARCHAR(191) NOT NULL,
    `attendanceRef` VARCHAR(191) NOT NULL,
    `audioUrl` VARCHAR(500) NOT NULL,
    `duration` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_audio_attendanceRef_idx`(`attendanceRef`),
    PRIMARY KEY (`audioKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_calendar` (
    `calendarKey` VARCHAR(191) NOT NULL,
    `empCode` VARCHAR(255) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `daysMask` VARCHAR(31) NOT NULL,
    `totalFullDays` INTEGER NOT NULL DEFAULT 0,
    `totalHalfDays` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `attendance_calendar_empCode_idx`(`empCode`),
    INDEX `attendance_calendar_year_month_idx`(`year`, `month`),
    UNIQUE INDEX `attendance_calendar_empCode_year_month_key`(`empCode`, `year`, `month`),
    PRIMARY KEY (`calendarKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `field_trips` (
    `tripKey` VARCHAR(191) NOT NULL,
    `empCode` VARCHAR(255) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `description` TEXT NULL,
    `createdBy` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `field_trips_empCode_idx`(`empCode`),
    INDEX `field_trips_startDate_endDate_idx`(`startDate`, `endDate`),
    INDEX `field_trips_isActive_idx`(`isActive`),
    PRIMARY KEY (`tripKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_locations` ADD CONSTRAINT `user_locations_empCode_fkey` FOREIGN KEY (`empCode`) REFERENCES `users`(`empCode`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_empCode_fkey` FOREIGN KEY (`empCode`) REFERENCES `users`(`empCode`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_dates` ADD CONSTRAINT `attendance_dates_empCode_fkey` FOREIGN KEY (`empCode`) REFERENCES `users`(`empCode`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_dates` ADD CONSTRAINT `attendance_dates_attendanceRef_fkey` FOREIGN KEY (`attendanceRef`) REFERENCES `attendance`(`attendanceKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_photos` ADD CONSTRAINT `attendance_photos_attendanceRef_fkey` FOREIGN KEY (`attendanceRef`) REFERENCES `attendance`(`attendanceKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_audio` ADD CONSTRAINT `attendance_audio_attendanceRef_fkey` FOREIGN KEY (`attendanceRef`) REFERENCES `attendance`(`attendanceKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_trips` ADD CONSTRAINT `field_trips_empCode_fkey` FOREIGN KEY (`empCode`) REFERENCES `user_locations`(`empCode`) ON DELETE CASCADE ON UPDATE CASCADE;
