-- AddForeignKey
ALTER TABLE "CleaningChecklist" ADD CONSTRAINT "CleaningChecklist_userCheckId_fkey" FOREIGN KEY ("userCheckId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
