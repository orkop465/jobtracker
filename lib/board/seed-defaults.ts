import type { ApplicationStatus, PrismaClient } from "@prisma/client";

export const DEFAULT_COLUMNS = [
  { name: "Applied", mappedStatus: "APPLIED", position: 0 },
  { name: "Recruiter Screen", mappedStatus: "RECRUITER_SCREEN", position: 1 },
  { name: "OA", mappedStatus: "OA", position: 2 },
  { name: "Interview 1", mappedStatus: "INTERVIEW_ROUND_1", position: 3 },
  { name: "Interview 2", mappedStatus: "INTERVIEW_ROUND_2", position: 4 },
  { name: "Interview 3", mappedStatus: "INTERVIEW_ROUND_3", position: 5 },
  { name: "Offer", mappedStatus: "OFFER", position: 6 },
  { name: "Rejected", mappedStatus: "REJECTED", position: 7 },
  { name: "Withdrawn", mappedStatus: "WITHDRAWN", position: 8 },
  { name: "Ghosted", mappedStatus: "GHOSTED", position: 9 },
] as const;

export async function seedDefaultColumns(
  userId: string,
  tx: PrismaClient
): Promise<void> {
  const count = await tx.boardColumn.count({ where: { userId } });
  if (count > 0) return;

  await tx.boardColumn.createMany({
    data: DEFAULT_COLUMNS.map((col) => ({
      userId,
      name: col.name,
      position: col.position,
      mappedStatus: col.mappedStatus as ApplicationStatus,
    })),
  });

  const columns = await tx.boardColumn.findMany({ where: { userId } });
  for (const col of columns) {
    if (col.mappedStatus) {
      await tx.application.updateMany({
        where: { userId, status: col.mappedStatus, boardColumnId: null },
        data: { boardColumnId: col.id },
      });
    }
  }
}
export const _BREAK_CI: any = 1;
