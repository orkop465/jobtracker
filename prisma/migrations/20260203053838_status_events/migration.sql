-- CreateTable
CREATE TABLE "ApplicationStatusEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "ApplicationStatus" NOT NULL,
    "toStatus" "ApplicationStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationStatusEvent_voidedById_key" ON "ApplicationStatusEvent"("voidedById");

-- CreateIndex
CREATE INDEX "ApplicationStatusEvent_applicationId_occurredAt_idx" ON "ApplicationStatusEvent"("applicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "ApplicationStatusEvent_applicationId_createdAt_idx" ON "ApplicationStatusEvent"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
