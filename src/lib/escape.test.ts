import { describe, it, expect } from "vitest";
import { escapeHtml, safeUrl } from "./escape.js";

describe("escapeHtml", () => {
  it("escapes HTML metacharacters", () => {
    expect(escapeHtml(`<script>alert("x&y")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;",
    );
  });

  it("escapes single quotes (attribute safety)", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("stringifies numbers", () => {
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("safeUrl", () => {
  it("allows http and https URLs", () => {
    expect(safeUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(safeUrl("http://example.com")).toBe("http://example.com");
  });

  it("allows root-relative paths, fragments, and queries", () => {
    expect(safeUrl("/events/1")).toBe("/events/1");
    expect(safeUrl("#section")).toBe("#section");
    expect(safeUrl("?q=1")).toBe("?q=1");
  });

  it("blocks dangerous schemes (including padded/mixed case)", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("JavaScript:alert(1)")).toBe("");
    expect(safeUrl("  javascript:alert(1)  ")).toBe("");
    expect(safeUrl("data:text/html,<script>")).toBe("");
    expect(safeUrl("vbscript:x")).toBe("");
  });

  it("blocks protocol-relative URLs", () => {
    expect(safeUrl("//evil.example")).toBe("");
  });

  it("returns empty for null/undefined/empty", () => {
    expect(safeUrl(null)).toBe("");
    expect(safeUrl(undefined)).toBe("");
    expect(safeUrl("")).toBe("");
  });
});
