import { describe, it, expect, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

// jwt.ts reads env lazily, but we re-import per test to exercise validateJwtConfig
// under different NODE_ENV/secret combinations.
async function loadJwt() {
  vi.resetModules();
  return await import("./jwt.js");
}

describe("jwt", () => {
  it("signs and verifies a token round-trip", async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "a-strong-test-secret";
    const { signToken, verifyToken } = await loadJwt();
    const token = signToken({ userId: 7, email: "a@b.c", sessionId: "sess-1" });
    const payload = verifyToken(token);
    expect(payload.userId).toBe(7);
    expect(payload.email).toBe("a@b.c");
    expect(payload.sessionId).toBe("sess-1");
  });

  it("rejects a tampered token", async () => {
    process.env.JWT_SECRET = "a-strong-test-secret";
    const { signToken, verifyToken } = await loadJwt();
    const token = signToken({ userId: 1, email: "a@b.c", sessionId: "sess-2" });
    expect(() => verifyToken(token + "x")).toThrow();
  });

  it("fails fast in production with the default/placeholder secret", async () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "change-me-in-production";
    const { validateJwtConfig } = await loadJwt();
    expect(() => validateJwtConfig()).toThrow(/JWT_SECRET/);
  });

  it("fails fast in production with no secret", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    const { validateJwtConfig } = await loadJwt();
    expect(() => validateJwtConfig()).toThrow(/JWT_SECRET/);
  });

  it("accepts a strong secret in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "0c2f1b8e-very-strong-and-unique";
    const { validateJwtConfig } = await loadJwt();
    expect(() => validateJwtConfig()).not.toThrow();
  });

  it("allows a dev fallback when not in production", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;
    const { validateJwtConfig } = await loadJwt();
    expect(() => validateJwtConfig()).not.toThrow();
  });
});
