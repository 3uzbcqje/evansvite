import { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { verifyToken } from "../lib/jwt.js";
import { isSessionValid } from "../services/sessions.js";

export interface AuthContext {
  userId: number;
  email: string;
}

const TOKEN_COOKIE = "token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, matches the JWT expiry

export function setAuthCookie(c: Context, token: string): void {
  setCookie(c, TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAuthCookie(c: Context): void {
  deleteCookie(c, TOKEN_COOKIE, { path: "/" });
}

function extractToken(c: Context): string | undefined {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return getCookie(c, TOKEN_COOKIE);
}

export async function authMiddleware(c: Context<{ Variables: { user: AuthContext } }>, next: Next) {
  const token = extractToken(c);

  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }
  try {
    const payload = verifyToken(token);
    if (!(await isSessionValid(payload.sessionId))) {
      return c.json({ error: "Invalid or expired session" }, 401);
    }
    c.set("user", { userId: payload.userId, email: payload.email });
    await next();
  } catch {
    return c.json({ error: "Invalid or expired session" }, 401);
  }
}

export async function optionalAuthMiddleware(c: Context<{ Variables: { user: AuthContext } }>, next: Next) {
  const token = extractToken(c);

  if (token) {
    try {
      const payload = verifyToken(token);
      if (await isSessionValid(payload.sessionId)) {
        c.set("user", { userId: payload.userId, email: payload.email });
      }
    } catch {
      // ignore invalid tokens
    }
  }
  await next();
}

export async function getUserFromCookie(c: Context): Promise<AuthContext | null> {
  const token = getCookie(c, TOKEN_COOKIE);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (!(await isSessionValid(payload.sessionId))) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
