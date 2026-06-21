import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes to a value different from the input", async () => {
    const hash = await hashPassword("hunter2-correct-horse");
    expect(hash).not.toBe("hunter2-correct-horse");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("verifies a correct password", async () => {
    const hash = await hashPassword("hunter2-correct-horse");
    expect(await verifyPassword("hunter2-correct-horse", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("hunter2-correct-horse");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a unique salt per hash", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toBe(b);
  });
});
