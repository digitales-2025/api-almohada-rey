/*
  Warnings:

  - You are about to drop the column `handSoap` on the `CleaningChecklist` table. All the data in the column will be lost.
  - You are about to drop the column `lamp` on the `CleaningChecklist` table. All the data in the column will be lost.
  - You are about to drop the column `showerSoap` on the `CleaningChecklist` table. All the data in the column will be lost.
  - You are about to drop the column `toiletPaper` on the `CleaningChecklist` table. All the data in the column will be lost.
  - You are about to drop the column `towel` on the `CleaningChecklist` table. All the data in the column will be lost.
  - You are about to drop the column `trashBin` on the `CleaningChecklist` table. All the data in the column will be lost.
  - You are about to drop the column `area` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `bed` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `floorType` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `guests` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `tv` on the `Room` table. All the data in the column will be lost.
  - Added the required column `date` to the `CleaningChecklist` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Room` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ImageRoom" DROP CONSTRAINT "ImageRoom_room_fkey";

-- AlterTable
ALTER TABLE "CleaningChecklist" DROP COLUMN "handSoap",
DROP COLUMN "lamp",
DROP COLUMN "showerSoap",
DROP COLUMN "toiletPaper",
DROP COLUMN "towel",
DROP COLUMN "trashBin",
ADD COLUMN     "date" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "area",
DROP COLUMN "bed",
DROP COLUMN "description",
DROP COLUMN "floorType",
DROP COLUMN "guests",
DROP COLUMN "price",
DROP COLUMN "tv",
ADD COLUMN     "handSoap" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lamp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showerSoap" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "toiletPaper" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "towel" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "trashBin" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- DropEnum
DROP TYPE "RoomTypes";

-- CreateTable
CREATE TABLE "RoomTypes" (
    "id" TEXT NOT NULL,
    "guests" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "tv" TEXT NOT NULL,
    "floorType" "FloorTypes" NOT NULL,
    "description" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "bed" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomTypes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImageRoom" ADD CONSTRAINT "ImageRoom_room_fkey" FOREIGN KEY ("room") REFERENCES "RoomTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_type_fkey" FOREIGN KEY ("type") REFERENCES "RoomTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
