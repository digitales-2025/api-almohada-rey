/*
  Warnings:

  - Made the column `descriptionEn` on table `RoomTypes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "RoomTypes" ALTER COLUMN "descriptionEn" SET NOT NULL;
