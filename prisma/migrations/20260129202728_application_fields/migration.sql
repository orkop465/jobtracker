-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "jobUrl" TEXT,
ADD COLUMN     "location" TEXT;

-- CreateIndex
CREATE INDEX "Application_company_idx" ON "Application"("company");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_appliedAt_idx" ON "Application"("appliedAt");
