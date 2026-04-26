/*
  Warnings:

  - Added the required column `userId` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ApplicationStatusEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Resume` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Application_appliedAt_idx";

-- DropIndex
DROP INDEX "Application_status_idx";

-- DropIndex
DROP INDEX "ApplicationStatusEvent_voidedById_key";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ApplicationStatusEvent" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE INDEX "Application_userId_status_idx" ON "Application"("userId", "status");

-- CreateIndex
CREATE INDEX "Application_userId_appliedAt_idx" ON "Application"("userId", "appliedAt");

-- CreateIndex
CREATE INDEX "ApplicationStatusEvent_userId_idx" ON "ApplicationStatusEvent"("userId");

-- CreateIndex
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
