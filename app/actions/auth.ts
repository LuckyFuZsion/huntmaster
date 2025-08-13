"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { encrypt } from "@/lib/protection"

export async function login(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  // Validate inputs
  if (!username || !password) {
    return { error: "Username and password are required" }
  }

  // Trim inputs to handle any whitespace issues
  const trimmedUsername = username.trim()
  const trimmedPassword = password.trim()

  console.log("Login attempt details:", {
    attemptedUsername: trimmedUsername,
    attemptedPasswordLength: trimmedPassword.length,
  })

  // Check credentials against environment variables
  const validUsers = [
    // Admin user
    {
      username: process.env.ADMIN_USERNAME?.trim(),
      password: process.env.ADMIN_PASSWORD?.trim(),
      isAdmin: true,
      userId: 999,
    },
    // Generate array of 10 regular users
    ...Array.from({ length: 10 }, (_, i) => {
      const userNumber = i + 1
      return {
        username: process.env[`USER${userNumber}_USERNAME`]?.trim(),
        password: process.env[`USER${userNumber}_PASSWORD`]?.trim(),
        isAdmin: false,
        userId: userNumber,
      }
    }),
  ].filter((user) => user.username && user.password) // Only include users with both username and password set

  console.log("Valid users found:", validUsers.length)
  console.log("User environment variables status:", {
    ADMIN: !!process.env.ADMIN_USERNAME,
    ...Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        `USER${i + 1}`,
        !!process.env[`USER${i + 1}_USERNAME`] && !!process.env[`USER${i + 1}_PASSWORD`],
      ]),
    ),
  })

  const user = validUsers.find((u) => {
    const usernameMatch = u.username === trimmedUsername
    const passwordMatch = u.password === trimmedPassword

    console.log("Checking credentials for:", u.username, {
      usernameMatch,
      passwordMatch,
      storedUsernameLength: u.username?.length,
      storedPasswordLength: u.password?.length,
      attemptedUsernameLength: trimmedUsername.length,
      attemptedPasswordLength: trimmedPassword.length,
      storedFirstChar: u.username ? u.username.charCodeAt(0) : null,
      attemptedFirstChar: trimmedUsername.charCodeAt(0),
    })

    return usernameMatch && passwordMatch
  })

  if (!user) {
    console.log("No matching user found")
    return { error: "Invalid credentials" }
  }

  console.log("Login successful for:", user.username)

  // Create session
  const session = {
    username: user.username,
    userId: user.userId,
    isAdmin: user.isAdmin,
    timestamp: Date.now(),
  }

  return {
    success: true,
    session: encrypt(JSON.stringify(session)),
  }
}

// Update the logout function to use the correct cookie API for Next.js 15
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.set("session", "", { expires: new Date(0) })
  redirect("/login")
}
