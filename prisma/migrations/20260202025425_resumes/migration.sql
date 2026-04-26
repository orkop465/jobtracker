-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "resumeId" TEXT;

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "gcsPath" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resume_gcsPath_key" ON "Resume"("gcsPath");

-- CreateIndex
CREATE INDEX "Application_resumeId_idx" ON "Application"("resumeId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
