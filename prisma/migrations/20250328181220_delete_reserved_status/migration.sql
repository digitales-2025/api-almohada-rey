/*
  Warnings:

  - The values [RESERVED] on the enum `RoomStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoomStatus_new" AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING');
ALTER TABLE "Room" ALTER COLUMN "status" TYPE "RoomStatus_new" USING ("status"::text::"RoomStatus_new");
ALTER TYPE "RoomStatus" RENAME TO "RoomStatus_old";
ALTER TYPE "RoomStatus_new" RENAME TO "RoomStatus";
DROP TYPE "RoomStatus_old";
COMMIT;
