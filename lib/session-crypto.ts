/** Client-safe session encoding (matches lib/protection encrypt/decrypt). */
export function decryptSession(text: string): string {
  return Buffer.from(text.includes(".") ? text.slice(0, text.lastIndexOf(".")) : text, "base64").toString("utf-8")
}
