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
    return Buffer.from(text, "base64").toString("utf-8")
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error("Failed to decrypt data")
  }
}

// Get all user credentials from environment variables
export const ENV_USERS = Array.from({ length: 10 }, (_, i) => {
  const userNumber = i + 1
  return {
    username: process.env[`USER${userNumber}_USERNAME`] || "",
    password: process.env[`USER${userNumber}_PASSWORD`] || "",
    userId: userNumber,
    isAdmin: false,
  }
})
  .concat([
    {
      username: process.env.ADMIN_USERNAME || "",
      password: process.env.ADMIN_PASSWORD || "",
      userId: 999,
      isAdmin: true,
    },
  ])
  // Filter out any users that don't have both username and password set
  .filter((user) => user.username && user.password)

