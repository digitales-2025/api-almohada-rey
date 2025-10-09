/*
  Warnings:

  - Changed the type of `type` on the `Warehouse` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('COMMERCIAL', 'INTERNAL_USE', 'DEPOSIT');

-- AlterTable
ALTER TABLE "Warehouse" DROP COLUMN "type",
ADD COLUMN     "type" "WarehouseType" NOT NULL;
