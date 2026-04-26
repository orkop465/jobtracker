-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('RECRUITER_SCREEN', 'PHONE_SCREEN', 'TECHNICAL', 'SYSTEM_DESIGN', 'BEHAVIORAL', 'TAKE_HOME', 'ONSITE', 'PANEL', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "weeklyGoal" INTEGER;

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "snoozedTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER,
    "type" "InterviewType" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_userId_done_dueDate_idx" ON "FollowUp"("userId", "done", "dueDate");

-- CreateIndex
CREATE INDEX "FollowUp_applicationId_idx" ON "FollowUp"("applicationId");

-- CreateIndex
CREATE INDEX "Interview_userId_scheduledAt_idx" ON "Interview"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Interview_applicationId_idx" ON "Interview"("applicationId");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
