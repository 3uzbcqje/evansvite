export function escapeHtml(str: string | number | null | undefined): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Returns the URL only if it uses a safe scheme, otherwise "". This blocks
// javascript:/data:/vbscript: payloads that escapeHtml alone does not stop
// (and that zod's .url() accepts) when a value is rendered into href/src.
// Allows absolute http(s) URLs and root-relative paths ("/...", "#...", "?...").
// The result must still be wrapped in escapeHtml() for the attribute context.
export function safeUrl(url: string | null | undefined): string {
  if (url == null) return "";
  const trimmed = String(url).trim();
  if (trimmed === "") return "";
  // Reject protocol-relative URLs ("//host") which bypass the scheme check.
  if (trimmed.startsWith("//")) return "";
  // Root-relative paths, fragments, and queries are safe.
  if (/^[/#?]/.test(trimmed)) return trimmed;
  try {
    const { protocol } = new URL(trimmed);
    if (protocol === "http:" || protocol === "https:") return trimmed;
  } catch {
    // Not a parseable absolute URL — treat as unsafe.
  }
  return "";
}
