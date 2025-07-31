/*
  Warnings:

  - Added the required column `bed` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "bed" TEXT NOT NULL;
