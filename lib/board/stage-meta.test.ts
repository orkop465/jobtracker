import { describe, it, expect } from "vitest";
import {
  computeDropInsertIdx,
  computeDropPosition,
} from "./stage-meta";

describe("computeDropInsertIdx", () => {
  const cards = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
  ];

  it("returns end when overCardId is null (drop on column body)", () => {
    expect(computeDropInsertIdx(cards, null, "above")).toBe(3);
    expect(computeDropInsertIdx(cards, null, "below")).toBe(3);
  });

  it("inserts above the over-card when side=above", () => {
    expect(computeDropInsertIdx(cards, "b", "above")).toBe(1);
  });

  it("inserts below the over-card when side=below", () => {
    expect(computeDropInsertIdx(cards, "b", "below")).toBe(2);
  });

  it("handles drop on first card", () => {
    expect(computeDropInsertIdx(cards, "a", "above")).toBe(0);
    expect(computeDropInsertIdx(cards, "a", "below")).toBe(1);
  });

  it("handles drop on last card", () => {
    expect(computeDropInsertIdx(cards, "c", "above")).toBe(2);
    expect(computeDropInsertIdx(cards, "c", "below")).toBe(3);
  });

  it("falls back to end when overCardId is not in target", () => {
    expect(computeDropInsertIdx(cards, "missing", "above")).toBe(3);
  });

  it("works with an empty target column", () => {
    expect(computeDropInsertIdx([], null, "above")).toBe(0);
    expect(computeDropInsertIdx([], "anything", "below")).toBe(0);
  });
});

describe("computeDropPosition", () => {
  it("returns before-1 when inserting at the top", () => {
    const cards = [{ position: 5 }, { position: 10 }];
    expect(computeDropPosition(cards, 0)).toBe(4);
  });

  it("returns after+1 when inserting at the end", () => {
    const cards = [{ position: 5 }, { position: 10 }];
    expect(computeDropPosition(cards, 2)).toBe(11);
  });

  it("returns midpoint when inserting between two cards", () => {
    const cards = [{ position: 5 }, { position: 10 }];
    expect(computeDropPosition(cards, 1)).toBe(7.5);
  });

  it("returns 1 when target column is empty", () => {
    expect(computeDropPosition([], 0)).toBe(1);
  });

  it("falls back to before+0.5 when neighbors share a position", () => {
    const cards = [{ position: 3 }, { position: 3 }];
    expect(computeDropPosition(cards, 1)).toBe(3.5);
  });

  it("preserves order across many sequential midpoint inserts", () => {
    let cards = [{ position: 1 }, { position: 4 }];
    const newPos1 = computeDropPosition(cards, 1);
    expect(newPos1).toBe(2.5);
    cards = [{ position: 1 }, { position: 2.5 }, { position: 4 }];
    const newPos2 = computeDropPosition(cards, 2);
    expect(newPos2).toBe(3.25);
    expect(newPos1).toBeLessThan(newPos2);
  });
});

describe("drag-drop end-to-end position derivation", () => {
  // These trace the user-visible behavior: pick an over-card and
  // cursor side, derive final position, verify ordering.

  it("same-column swap (B over A, side=above) → B above A", () => {
    // Initial: A(pos=1), B(pos=2). Drag B onto A side=above.
    const targetCards = [{ id: "a", position: 1 }];
    const idx = computeDropInsertIdx(targetCards, "a", "above");
    const newPos = computeDropPosition(targetCards, idx);
    expect(newPos).toBeLessThan(1);
  });

  it("computes 'insert below A' as A.position + 1", () => {
    // Math primitive only — same-column reorders use arrayMove on
    // dragEnd, not this cursor-side path. This branch is now reserved
    // for cross-column drops on a card and column-body drops.
    const targetCards = [{ id: "a", position: 1 }];
    const idx = computeDropInsertIdx(targetCards, "a", "below");
    const newPos = computeDropPosition(targetCards, idx);
    expect(newPos).toBe(2);
  });

  it("cross-column drop between X and Y → fractional between", () => {
    const targetCards = [
      { id: "x", position: 1 },
      { id: "y", position: 2 },
    ];
    const idx = computeDropInsertIdx(targetCards, "y", "above");
    const newPos = computeDropPosition(targetCards, idx);
    expect(newPos).toBeGreaterThan(1);
    expect(newPos).toBeLessThan(2);
  });

  it("drop at top of populated column lands above the first card", () => {
    const targetCards = [
      { id: "x", position: 5 },
      { id: "y", position: 10 },
    ];
    const idx = computeDropInsertIdx(targetCards, "x", "above");
    const newPos = computeDropPosition(targetCards, idx);
    expect(newPos).toBeLessThan(5);
  });

  it("drop on column body of empty column → position 1", () => {
    const idx = computeDropInsertIdx([], null, "below");
    const newPos = computeDropPosition([], idx);
    expect(newPos).toBe(1);
  });
});
