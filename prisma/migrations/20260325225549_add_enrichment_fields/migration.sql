-- CreateEnum
CREATE TYPE "ApplicationSource" AS ENUM ('LINKEDIN', 'INDEED', 'GLASSDOOR', 'COMPANY_WEBSITE', 'REFERRAL', 'RECRUITER_OUTREACH', 'JOB_BOARD', 'CAREER_FAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactLinkedIn" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'USD',
ADD COLUMN     "jobDescription" TEXT,
ADD COLUMN     "nextFollowUp" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "priority" "Priority" DEFAULT 'MEDIUM',
ADD COLUMN     "salaryMax" INTEGER,
ADD COLUMN     "salaryMin" INTEGER,
ADD COLUMN     "source" "ApplicationSource";

-- CreateIndex
CREATE INDEX "Application_userId_nextFollowUp_idx" ON "Application"("userId", "nextFollowUp");

-- CreateIndex
CREATE INDEX "Application_userId_updatedAt_idx" ON "Application"("userId", "updatedAt");
