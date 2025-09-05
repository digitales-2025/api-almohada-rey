/*
  Warnings:

  - You are about to drop the `dni_cache` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."dni_cache";

-- CreateTable
CREATE TABLE "public"."api_peru_cache" (
    "id" TEXT NOT NULL,
    "dni" TEXT,
    "ruc" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_peru_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_peru_cache_id_key" ON "public"."api_peru_cache"("id");

-- CreateIndex
CREATE UNIQUE INDEX "api_peru_cache_dni_key" ON "public"."api_peru_cache"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "api_peru_cache_ruc_key" ON "public"."api_peru_cache"("ruc");
