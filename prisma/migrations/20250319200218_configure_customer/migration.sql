/*
  Warnings:

  - Changed the type of `documentType` on the `Customer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `maritalStatus` on the `Customer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CustomerDocumentType" AS ENUM ('DNI', 'PASSPORT', 'FOREIGNER_CARD');

-- CreateEnum
CREATE TYPE "CustomerMaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "department" DROP NOT NULL,
ALTER COLUMN "province" DROP NOT NULL,
DROP COLUMN "documentType",
ADD COLUMN     "documentType" "CustomerDocumentType" NOT NULL,
DROP COLUMN "maritalStatus",
ADD COLUMN     "maritalStatus" "CustomerMaritalStatus" NOT NULL;
