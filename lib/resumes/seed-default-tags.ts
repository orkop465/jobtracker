import type { PrismaClient } from "@prisma/client";

export interface DefaultResumeTag {
  name: string;
  color: string;
}

/** Six default tags mirror the prior hardcoded TAG_PILLS set. */
export const DEFAULT_RESUME_TAGS: DefaultResumeTag[] = [
  { name: "SWE", color: "oklch(0.58 0.09 235)" },
  { name: "PM", color: "oklch(0.62 0.155 55)" },
  { name: "Design", color: "oklch(0.62 0.08 310)" },
  { name: "Data", color: "oklch(0.66 0.10 100)" },
  { name: "ML", color: "oklch(0.60 0.13 150)" },
  { name: "Other", color: "oklch(0.55 0.02 280)" },
];

type SeedablePrisma = Pick<PrismaClient, "resumeTag">;

export async function seedDefaultResumeTags(
  userId: string,
  prisma: SeedablePrisma,
): Promise<void> {
  const existing = await prisma.resumeTag.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.resumeTag.createMany({
    data: DEFAULT_RESUME_TAGS.map((t, idx) => ({
      userId,
      name: t.name,
      color: t.color,
      position: idx,
    })),
    skipDuplicates: true,
  });
}
