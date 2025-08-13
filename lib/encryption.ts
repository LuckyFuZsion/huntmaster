// Simple encryption for sensitive data (enhanced version)
export function decrypt(text: string): string {
  try {
    const shift = 5
    return atob(text)
      .split("")
      .map((char) =>
        String.fromCharCode(
          (char.charCodeAt(0) ^ 0xa5) - shift, // Reverse the encryption
        ),
      )
      .join("")
  } catch (error) {
    console.error("Decryption error:", error)
    return "" // Or handle the error as appropriate for your application
  }
}

