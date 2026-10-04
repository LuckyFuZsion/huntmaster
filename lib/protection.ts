// Simple encryption/decryption using base64 for development
export const encrypt = (text: string): string => {
  try {
    return Buffer.from(text).toString("base64")
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error("Failed to encrypt data")
  }
}

export const decrypt = (text: string): string => {
  try {
    // Session tokens are "<base64 payload>.<signature>"; the signature is only verified server-side (lib/session.ts)
    const payload = text.includes(".") ? text.slice(0, text.lastIndexOf(".")) : text
    return Buffer.from(payload, "base64").toString("utf-8")
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error("Failed to decrypt data")
  }
}
