-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "reportedById" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_reportedById_fkey";

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
