-- CreateEnum
CREATE TYPE "MarketplaceRoleCategory" AS ENUM ('SWE', 'PM', 'DESIGN', 'DATA', 'ML', 'DEVOPS', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketplaceSeniority" AS ENUM ('STUDENT', 'INTERN', 'ENTRY', 'MID', 'SENIOR', 'STAFF_PLUS');

-- CreateEnum
CREATE TYPE "PublicResumeStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'UNPUBLISHED');

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "roleCategory" "MarketplaceRoleCategory",
ADD COLUMN     "seniority" "MarketplaceSeniority";

-- CreateTable
CREATE TABLE "PublicResume" (
    "id" TEXT NOT NULL,
    "uploaderUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleCategory" "MarketplaceRoleCategory" NOT NULL,
    "seniority" "MarketplaceSeniority" NOT NULL,
    "notes" TEXT,
    "gcsPath" TEXT NOT NULL,
    "thumbGcsPath" TEXT,
    "pageCount" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "PublicResumeStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicResumeRating" (
    "id" TEXT NOT NULL,
    "publicResumeId" TEXT NOT NULL,
    "raterUserId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicResumeRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicResume_gcsPath_key" ON "PublicResume"("gcsPath");

-- CreateIndex
CREATE INDEX "PublicResume_uploaderUserId_idx" ON "PublicResume"("uploaderUserId");

-- CreateIndex
CREATE INDEX "PublicResume_status_publishedAt_idx" ON "PublicResume"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "PublicResume_roleCategory_seniority_status_idx" ON "PublicResume"("roleCategory", "seniority", "status");

-- CreateIndex
CREATE INDEX "PublicResumeRating_raterUserId_idx" ON "PublicResumeRating"("raterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicResumeRating_publicResumeId_raterUserId_key" ON "PublicResumeRating"("publicResumeId", "raterUserId");

-- AddForeignKey
ALTER TABLE "PublicResume" ADD CONSTRAINT "PublicResume_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicResumeRating" ADD CONSTRAINT "PublicResumeRating_publicResumeId_fkey" FOREIGN KEY ("publicResumeId") REFERENCES "PublicResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicResumeRating" ADD CONSTRAINT "PublicResumeRating_raterUserId_fkey" FOREIGN KEY ("raterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Search support
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "PublicResume_search_trgm_idx"
  ON "PublicResume"
  USING GIN (
    (lower("title" || ' ' || coalesce("notes",''))) gin_trgm_ops
  );
