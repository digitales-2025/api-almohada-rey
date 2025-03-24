/*
  Warnings:

  - You are about to drop the `ImageRoom` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ImageRoom" DROP CONSTRAINT "ImageRoom_room_fkey";

-- DropTable
DROP TABLE "ImageRoom";

-- CreateTable
CREATE TABLE "ImageRoomType" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "room" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageRoomType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImageRoomType" ADD CONSTRAINT "ImageRoomType_room_fkey" FOREIGN KEY ("room") REFERENCES "RoomTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
