/*
  Warnings:

  - Added the required column `origin` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reason` to the `Reservation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "origin" TEXT NOT NULL,
ADD COLUMN     "reason" TEXT NOT NULL;
