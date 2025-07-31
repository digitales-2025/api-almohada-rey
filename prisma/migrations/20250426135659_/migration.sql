-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FIXED', 'VARIABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD');

-- CreateEnum
CREATE TYPE "ExpenseDocumentType" AS ENUM ('RECEIPT', 'INVOICE', 'OTHER');

-- CreateTable
CREATE TABLE "HotelExpense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "paymentMethod" "ExpensePaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TEXT NOT NULL,
    "documentType" "ExpenseDocumentType",
    "documentNumber" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelExpense_pkey" PRIMARY KEY ("id")
);
