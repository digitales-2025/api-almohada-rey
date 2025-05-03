-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_userId_fkey";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "birthPlace" DROP NOT NULL,
ALTER COLUMN "occupation" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "maritalStatus" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "didAcceptExtraServices" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "didAcceptTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestedGuestNumber" INTEGER,
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
