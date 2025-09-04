/*
  Warnings:

  - A unique constraint covering the columns `[ruc]` on the table `dni_cache` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."dni_cache" ADD COLUMN     "ruc" TEXT,
ALTER COLUMN "dni" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "dni_cache_ruc_key" ON "public"."dni_cache"("ruc");
