import { prisma } from "@/lib/prisma";

// Recompute aggregate (count + sum) for a public resume from its ratings.
// Call inside the same transaction as the rating mutation.
export async function recomputeAggregate(publicResumeId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "PublicResume"
    SET
      "ratingCount" = (SELECT COUNT(*) FROM "PublicResumeRating" WHERE "publicResumeId" = ${publicResumeId}),
      "ratingSum"   = (SELECT COALESCE(SUM(stars), 0) FROM "PublicResumeRating" WHERE "publicResumeId" = ${publicResumeId})
    WHERE id = ${publicResumeId}
  `;
}
