/*
  Warnings:

  - You are about to drop the column `userProfileId` on the `Reservation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_userProfileId_fkey";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "userProfileId",
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
