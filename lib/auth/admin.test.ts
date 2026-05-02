import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdmin } from "./admin";

const ORIG = process.env.ADMIN_EMAILS;

describe("isAdmin", () => {
  beforeEach(() => {
    delete process.env.ADMIN_EMAILS;
  });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = ORIG;
  });

  it("returns false when ADMIN_EMAILS is unset", () => {
    expect(isAdmin({ user: { email: "anyone@example.com" } } as never)).toBe(false);
  });

  it("returns false for null session", () => {
    process.env.ADMIN_EMAILS = "a@x.com";
    expect(isAdmin(null)).toBe(false);
  });

  it("returns true for exact match", () => {
    process.env.ADMIN_EMAILS = "a@x.com,b@x.com";
    expect(isAdmin({ user: { email: "a@x.com" } } as never)).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    process.env.ADMIN_EMAILS = " A@X.com , b@y.com ";
    expect(isAdmin({ user: { email: "a@x.com" } } as never)).toBe(true);
    expect(isAdmin({ user: { email: "B@Y.COM" } } as never)).toBe(true);
  });

  it("returns false for unmatched email", () => {
    process.env.ADMIN_EMAILS = "a@x.com";
    expect(isAdmin({ user: { email: "intruder@x.com" } } as never)).toBe(false);
  });

  it("ignores empty entries", () => {
    process.env.ADMIN_EMAILS = ",,a@x.com,,";
    expect(isAdmin({ user: { email: "a@x.com" } } as never)).toBe(true);
    expect(isAdmin({ user: { email: "" } } as never)).toBe(false);
  });
});
