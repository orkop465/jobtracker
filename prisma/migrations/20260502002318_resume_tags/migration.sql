-- CreateTable
CREATE TABLE "ResumeTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeTagOnResume" (
    "resumeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ResumeTagOnResume_pkey" PRIMARY KEY ("resumeId","tagId")
);

-- CreateIndex
CREATE INDEX "ResumeTag_userId_idx" ON "ResumeTag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeTag_userId_name_key" ON "ResumeTag"("userId", "name");

-- CreateIndex
CREATE INDEX "ResumeTagOnResume_tagId_idx" ON "ResumeTagOnResume"("tagId");

-- AddForeignKey
ALTER TABLE "ResumeTag" ADD CONSTRAINT "ResumeTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTagOnResume" ADD CONSTRAINT "ResumeTagOnResume_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTagOnResume" ADD CONSTRAINT "ResumeTagOnResume_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ResumeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
