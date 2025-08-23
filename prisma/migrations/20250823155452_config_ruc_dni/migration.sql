/*
  Warnings:

  - You are about to drop the column `ruc` on the `api_peru_cache` table. All the data in the column will be lost.
  - Made the column `dni` on table `api_peru_cache` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."api_peru_cache_ruc_key";

-- AlterTable
ALTER TABLE "public"."api_peru_cache" DROP COLUMN "ruc",
ALTER COLUMN "dni" SET NOT NULL;
