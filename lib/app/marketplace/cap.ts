import { prisma } from "@/lib/prisma";
import { LIMITS } from "./constants";

export interface CapStatus {
  pending: number;
  published: number;
  ok: boolean;
}

export async function checkSubmissionCap(userId: string): Promise<CapStatus> {
  const [pending, published] = await Promise.all([
    prisma.publicResume.count({
      where: { uploaderUserId: userId, status: "PENDING_REVIEW" },
    }),
    prisma.publicResume.count({
      where: { uploaderUserId: userId, status: "PUBLISHED" },
    }),
  ]);
  return {
    pending,
    published,
    ok: pending < LIMITS.pendingPerUser && published < LIMITS.publishedPerUser,
  };
}
