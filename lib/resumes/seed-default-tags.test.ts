import { describe, it, expect, vi } from "vitest";
import { seedDefaultResumeTags, DEFAULT_RESUME_TAGS } from "./seed-default-tags";

describe("seedDefaultResumeTags", () => {
  it("inserts the default tag set when the user has none", async () => {
    const created: Array<{ name: string; color: string | null }> = [];
    const fakePrisma = {
      resumeTag: {
        count: vi.fn().mockResolvedValue(0),
        createMany: vi.fn().mockImplementation(async (args) => {
          for (const d of args.data) created.push({ name: d.name, color: d.color ?? null });
          return { count: args.data.length };
        }),
      },
    } as unknown as Parameters<typeof seedDefaultResumeTags>[1];

    await seedDefaultResumeTags("u1", fakePrisma);
    expect(created.map((c) => c.name)).toEqual(
      DEFAULT_RESUME_TAGS.map((t) => t.name),
    );
  });

  it("is a no-op when the user already has tags", async () => {
    const createMany = vi.fn();
    const fakePrisma = {
      resumeTag: {
        count: vi.fn().mockResolvedValue(3),
        createMany,
      },
    } as unknown as Parameters<typeof seedDefaultResumeTags>[1];

    await seedDefaultResumeTags("u1", fakePrisma);
    expect(createMany).not.toHaveBeenCalled();
  });
});
