/*
  Warnings:

  - You are about to drop the column `room` on the `ImageRoomType` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Room` table. All the data in the column will be lost.
  - Added the required column `roomTypeId` to the `ImageRoomType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomTypeId` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `RoomTypes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ImageRoomType" DROP CONSTRAINT "ImageRoomType_room_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_type_fkey";

-- AlterTable
ALTER TABLE "ImageRoomType" DROP COLUMN "room",
ADD COLUMN     "roomTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "type",
ADD COLUMN     "roomTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RoomTypes" ADD COLUMN     "name" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ImageRoomType" ADD CONSTRAINT "ImageRoomType_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
