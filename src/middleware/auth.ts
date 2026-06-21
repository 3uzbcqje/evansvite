import { Context, Next } from "hono";
import { verifyToken } from "../lib/jwt.js";

export interface AuthContext {
  userId: number;
  email: string;
}

export async function authMiddleware(c: Context<{ Variables: { user: AuthContext } }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }
  try {
    const payload = verifyToken(token);
    c.set("user", { userId: payload.userId, email: payload.email });
    await next();
  } catch {
    return c.json({ error: "Invalid or expired session" }, 401);
  }
}

export async function optionalAuthMiddleware(c: Context<{ Variables: { user: AuthContext } }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (token) {
    try {
      const payload = verifyToken(token);
      c.set("user", { userId: payload.userId, email: payload.email });
    } catch {
      // ignore invalid tokens
    }
  }
  await next();
}
