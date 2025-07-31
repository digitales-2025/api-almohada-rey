-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "createdByLandingPage" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "createdByLandingPage" BOOLEAN DEFAULT false,
ALTER COLUMN "origin" DROP NOT NULL,
ALTER COLUMN "reason" DROP NOT NULL;
