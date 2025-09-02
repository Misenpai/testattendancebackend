/*
  Warnings:

  - You are about to alter the column `locationType` on the `attendances` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `attendances` MODIFY `locationType` ENUM('CAMPUS', 'FIELDTRIP') NOT NULL DEFAULT 'CAMPUS';
