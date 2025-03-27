/*
  Warnings:

  - The primary key for the `CleaningChecklist` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "CleaningChecklist" DROP CONSTRAINT "CleaningChecklist_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "CleaningChecklist_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CleaningChecklist_id_seq";
