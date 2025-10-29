"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { encrypt } from "@/lib/protection"
import { firestoreAdmin } from "@/lib/firestore-admin"
import bcrypt from "bcryptjs"

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

  try {
    // Try to find user in Firestore
    const user = await firestoreAdmin.users.findByUsername(trimmedUsername)

    if (!user) {
      console.log("No user found in Firestore, checking environment variables")
      // Fallback to environment variables for backwards compatibility
      return await legacyLogin(trimmedUsername, trimmedPassword)
    }

    // Verify password
    if (!user.password) {
      return { error: "Invalid credentials" }
    }

    const isValidPassword = await bcrypt.compare(trimmedPassword, user.password)

    if (!isValidPassword) {
      return { error: "Invalid credentials" }
    }

    console.log("Login successful for:", user.username)

    // Create session
    const session = {
      username: user.username,
      userId: user.id,
      isAdmin: user.isAdmin,
      timestamp: Date.now(),
    }

    return {
      success: true,
      session: encrypt(JSON.stringify(session)),
    }
  } catch (error) {
    console.error("Login error:", error)
    // Fallback to environment variables
    return await legacyLogin(trimmedUsername, trimmedPassword)
  }
}

// Legacy login function using environment variables
async function legacyLogin(username: string, password: string) {
  // First, try to find the user in Firestore
  try {
    const firestoreUser = await firestoreAdmin.users.findByUsername(username)
    if (firestoreUser) {
      // User exists in Firestore, use their Firestore ID
      const session = {
        username: firestoreUser.username,
        userId: firestoreUser.id, // Use Firestore document ID
        isAdmin: firestoreUser.isAdmin,
        timestamp: Date.now(),
      }
      return {
        success: true,
        session: encrypt(JSON.stringify(session)),
      }
    }
  } catch (error) {
    console.error("Error finding user in Firestore:", error)
  }

  // If not found in Firestore, use legacy environment variables with a temporary ID
  const validUsers = [
    // Admin user
    {
      username: process.env.ADMIN_USERNAME?.trim(),
      password: process.env.ADMIN_PASSWORD?.trim(),
      isAdmin: true,
      userId: `legacy_${process.env.ADMIN_USERNAME?.trim()}`,
    },
    // Generate array of 10 regular users
    ...Array.from({ length: 10 }, (_, i) => {
      const userNumber = i + 1
      return {
        username: process.env[`USER${userNumber}_USERNAME`]?.trim(),
        password: process.env[`USER${userNumber}_PASSWORD`]?.trim(),
        isAdmin: false,
        userId: `legacy_${process.env[`USER${userNumber}_USERNAME`]?.trim()}`,
      }
    }),
  ].filter((user) => user.username && user.password)

  const user = validUsers.find((u) => {
    const usernameMatch = u.username === username
    const passwordMatch = u.password === password
    return usernameMatch && passwordMatch
  })

  if (!user) {
    return { error: "Invalid credentials" }
  }

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
