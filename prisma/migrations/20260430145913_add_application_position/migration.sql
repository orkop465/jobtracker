-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "position" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: assign sequential positions per (userId, boardColumnId) by appliedAt.
UPDATE "Application" a
SET "position" = sub.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "userId", "boardColumnId" ORDER BY "appliedAt") AS rn
  FROM "Application"
) sub
WHERE a.id = sub.id;
