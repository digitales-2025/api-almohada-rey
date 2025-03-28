/*
  Warnings:

  - The values [LIMINATING] on the enum `FloorTypes` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FloorTypes_new" AS ENUM ('LAMINATING', 'CARPETING');
ALTER TABLE "RoomTypes" ALTER COLUMN "floorType" TYPE "FloorTypes_new" USING ("floorType"::text::"FloorTypes_new");
ALTER TYPE "FloorTypes" RENAME TO "FloorTypes_old";
ALTER TYPE "FloorTypes_new" RENAME TO "FloorTypes";
DROP TYPE "FloorTypes_old";
COMMIT;
