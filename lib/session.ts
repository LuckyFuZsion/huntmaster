import { createHmac, timingSafeEqual } from "crypto"

/**
 * Signed session tokens: `<base64(json)>.<hmac-sha256>`.
 *
 * The payload stays readable by client code (lib/protection `decrypt` ignores the signature),
 * but the server only trusts a token whose signature matches, so a userId/isAdmin can't be forged.
 * Set SESSION_SECRET (falls back to SECRET_KEY) to a long random value.
 */

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 90 // 90 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET (or SECRET_KEY) must be set to at least 16 characters")
  }
  return secret
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
}

export function signSession(session: object): string {
  const payloadB64 = Buffer.from(JSON.stringify(session)).toString("base64")
  return `${payloadB64}.${sign(payloadB64)}`
}

/** Returns the session payload, or null if the token is missing, unsigned, tampered with or expired. */
export function verifySession(token: string | null | undefined): any | null {
  if (!token || typeof token !== "string") return null
  const dot = token.lastIndexOf(".")
  if (dot <= 0) return null
  const payloadB64 = token.slice(0, dot)
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(sign(payloadB64))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const data = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"))
    if (typeof data?.timestamp === "number" && Date.now() - data.timestamp > MAX_AGE_MS) return null
    return data
  } catch {
    return null
  }
}

/** Like verifySession but throws, so existing try/catch blocks treat a bad token as an auth failure. */
export function requireSession(token: string | null | undefined): any {
  const data = verifySession(token)
  if (!data) throw new Error("Invalid or expired session")
  return data
}
