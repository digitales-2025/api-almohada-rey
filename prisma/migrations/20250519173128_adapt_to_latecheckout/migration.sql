-- AlterEnum
ALTER TYPE "PaymentDetailType" ADD VALUE 'LATE_CHECKOUT';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "appliedLateCheckOut" BOOLEAN NOT NULL DEFAULT false;
