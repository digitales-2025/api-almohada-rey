-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "blacklistDate" TIMESTAMP(3),
ADD COLUMN     "blacklistReason" TEXT,
ADD COLUMN     "blacklistedById" TEXT,
ADD COLUMN     "isBlacklist" BOOLEAN DEFAULT false;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_blacklistedById_fkey" FOREIGN KEY ("blacklistedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
