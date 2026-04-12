import { describe, it, expect } from "vitest";
import { DEFAULT_COLUMNS } from "./seed-defaults";

describe("DEFAULT_COLUMNS", () => {
  it("has exactly 10 columns covering all statuses", () => {
    expect(DEFAULT_COLUMNS).toHaveLength(10);
  });

  it("has unique positions 0 through 9", () => {
    const positions = DEFAULT_COLUMNS.map((c) => c.position).sort((a, b) => a - b);
    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("has unique mapped statuses", () => {
    const statuses = DEFAULT_COLUMNS.map((c) => c.mappedStatus);
    expect(new Set(statuses).size).toBe(statuses.length);
  });

  it("includes all terminal statuses", () => {
    const statuses = new Set(DEFAULT_COLUMNS.map((c) => c.mappedStatus));
    for (const s of ["REJECTED", "WITHDRAWN", "GHOSTED"]) {
      expect(statuses.has(s)).toBe(true);
    }
  });

  it("starts with APPLIED and ends with GHOSTED", () => {
    expect(DEFAULT_COLUMNS[0].mappedStatus).toBe("APPLIED");
    expect(DEFAULT_COLUMNS[9].mappedStatus).toBe("GHOSTED");
  });
});
