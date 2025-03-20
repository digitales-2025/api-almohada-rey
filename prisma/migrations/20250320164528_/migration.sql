-- CreateEnum
CREATE TYPE "FloorTypes" AS ENUM ('LIMINATING', 'CARPETING');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING');

-- CreateEnum
CREATE TYPE "RoomTypes" AS ENUM ('SINGLE', 'DOUBLE_SINGLE', 'DOUBLE_FAMILY', 'SUITE', 'MATRIMONIAL');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "guests" INTEGER NOT NULL,
    "type" "RoomTypes" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "RoomStatus" NOT NULL,
    "tv" TEXT NOT NULL,
    "floorType" "FloorTypes" NOT NULL,
    "description" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageRoom" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "room" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningChecklist" (
    "id" SERIAL NOT NULL,
    "roomId" TEXT NOT NULL,
    "trashBin" BOOLEAN NOT NULL,
    "towel" BOOLEAN NOT NULL,
    "toiletPaper" BOOLEAN NOT NULL,
    "showerSoap" BOOLEAN NOT NULL,
    "handSoap" BOOLEAN NOT NULL,
    "lamp" BOOLEAN NOT NULL,
    "staffName" TEXT NOT NULL,
    "userCheckId" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_number_key" ON "Room"("number");

-- AddForeignKey
ALTER TABLE "ImageRoom" ADD CONSTRAINT "ImageRoom_room_fkey" FOREIGN KEY ("room") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningChecklist" ADD CONSTRAINT "CleaningChecklist_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
