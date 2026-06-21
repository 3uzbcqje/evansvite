import jwt from "jsonwebtoken";

const DEV_FALLBACK_SECRET = "dev-secret-do-not-use-in-production";

// Secrets that must never be used in production (the dev fallback and the
// placeholder shipped in .env.example).
const INSECURE_SECRETS = new Set([DEV_FALLBACK_SECRET, "change-me-in-production"]);

function resolveSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || INSECURE_SECRETS.has(secret)) {
      throw new Error(
        "JWT_SECRET must be set to a strong, unique value in production. " +
          "Refusing to start with a missing or default secret.",
      );
    }
    return secret;
  }
  return secret || DEV_FALLBACK_SECRET;
}

// Call once at startup so a misconfigured production deploy fails fast
// instead of issuing forgeable tokens on the first login.
export function validateJwtConfig(): void {
  resolveSecret();
}

export interface JwtPayload {
  userId: number;
  email: string;
  // Identifies the server-side session row; deleting that row revokes the token.
  sessionId: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, resolveSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, resolveSecret()) as JwtPayload;
}
