-- CreateTable
CREATE TABLE "BoardColumn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "mappedStatus" "ApplicationStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardColumn_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "boardColumnId" TEXT;

-- CreateIndex
CREATE INDEX "BoardColumn_userId_position_idx" ON "BoardColumn"("userId", "position");

-- CreateIndex
CREATE INDEX "Application_boardColumnId_idx" ON "Application"("boardColumnId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_boardColumnId_fkey" FOREIGN KEY ("boardColumnId") REFERENCES "BoardColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardColumn" ADD CONSTRAINT "BoardColumn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
