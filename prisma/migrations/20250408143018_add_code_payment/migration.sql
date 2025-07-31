/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_code_key" ON "Payment"("code");
