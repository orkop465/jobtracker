import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { generateToken, TOKEN_EXPIRY_MS } from "./verification";

describe("generateToken", () => {
  it("returns a URL-safe base64 string", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns 43-character string (256 bits in base64url)", () => {
    const token = generateToken();
    expect(token).toHaveLength(43);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("TOKEN_EXPIRY_MS", () => {
  it("is 24 hours in milliseconds", () => {
    expect(TOKEN_EXPIRY_MS).toBe(24 * 60 * 60 * 1000);
  });
});
