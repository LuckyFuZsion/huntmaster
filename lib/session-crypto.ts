/** Client-safe session encoding (matches lib/protection encrypt/decrypt). */
export function decryptSession(text: string): string {
  return Buffer.from(text, "base64").toString("utf-8")
}
