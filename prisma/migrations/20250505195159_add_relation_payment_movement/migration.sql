-- AlterTable
ALTER TABLE "PaymentDetail" ADD COLUMN     "movementsDetailId" TEXT;

-- AddForeignKey
ALTER TABLE "PaymentDetail" ADD CONSTRAINT "PaymentDetail_movementsDetailId_fkey" FOREIGN KEY ("movementsDetailId") REFERENCES "MovementsDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
