-- Persist marketplace saves so the bookmark icon survives page refresh.
CREATE TABLE "PublicResumeSave" (
    "id" TEXT NOT NULL,
    "publicResumeId" TEXT NOT NULL,
    "saverUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicResumeSave_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PublicResumeSave_publicResumeId_saverUserId_key" ON "PublicResumeSave"("publicResumeId", "saverUserId");
CREATE INDEX "PublicResumeSave_saverUserId_idx" ON "PublicResumeSave"("saverUserId");
ALTER TABLE "PublicResumeSave" ADD CONSTRAINT "PublicResumeSave_publicResumeId_fkey" FOREIGN KEY ("publicResumeId") REFERENCES "PublicResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicResumeSave" ADD CONSTRAINT "PublicResumeSave_saverUserId_fkey" FOREIGN KEY ("saverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
