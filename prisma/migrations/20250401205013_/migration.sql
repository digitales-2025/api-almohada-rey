/*
  Warnings:

  - You are about to drop the column `area` on the `RoomTypes` table. All the data in the column will be lost.
  - You are about to drop the column `floorType` on the `RoomTypes` table. All the data in the column will be lost.
  - You are about to drop the column `tv` on the `RoomTypes` table. All the data in the column will be lost.
  - Added the required column `area` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `floorType` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tv` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "area" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "floorType" "FloorTypes" NOT NULL,
ADD COLUMN     "tv" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RoomTypes" DROP COLUMN "area",
DROP COLUMN "floorType",
DROP COLUMN "tv";
