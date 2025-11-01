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
    // Try to find user in Supabase first, then Firestore as fallback
    let user = null
    try {
      const { supabaseAdmin } = await import("@/lib/supabase-admin")
      user = await supabaseAdmin.users.findByUsername(trimmedUsername)
    } catch (supabaseError) {
      console.log("Supabase not available, trying Firestore:", supabaseError)
      // Fallback to Firestore
      user = await firestoreAdmin.users.findByUsername(trimmedUsername)
    }

    if (!user) {
      console.log("No user found in database, checking environment variables")
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

    // Check if user has HuntMaster access
    // Only users with huntmaster flag set to true can access the application
    // (existing Firebase users should have this set to true when migrated)
    const hasHuntmasterAccess = user.huntmaster === true

    if (!hasHuntmasterAccess) {
      return {
        success: false,
        error: "HuntMaster access required. Please contact an administrator.",
        huntmasterAccess: false,
      }
    }

    // Check if user is active - admins are always considered active
    // Legacy users (without isActive field) are treated as active for backwards compatibility
    // Only users with explicit isActive === false are inactive
    const isUserActive = user.isAdmin || user.isActive !== false

    if (!isUserActive) {
      // User is inactive - return inactive flag
      return {
        success: false,
        error: "Account access required",
        inactive: true,
      }
    }

    console.log("Login successful for:", user.username)

    // Create session
    // Use huntmasterAdmin for HuntMaster admin access (separate from main app admin)
    const session = {
      username: user.username,
      userId: user.id,
      isAdmin: user.huntmasterAdmin ?? false, // HuntMaster admin flag
      isActive: true,
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
  // First, try to find the user in Supabase or Firestore
  try {
    let dbUser = null
    try {
      // Try Supabase first
      const { supabaseAdmin } = await import("@/lib/supabase-admin")
      dbUser = await supabaseAdmin.users.findByUsername(username)
    } catch (supabaseError) {
      // Fallback to Firestore
      dbUser = await firestoreAdmin.users.findByUsername(username)
    }
    
    if (dbUser) {
      // User exists in database, use their database ID
      const session = {
        username: dbUser.username,
        userId: dbUser.id,
        isAdmin: dbUser.huntmasterAdmin ?? dbUser.isAdmin ?? false, // Use HuntMaster admin flag
        timestamp: Date.now(),
      }
      return {
        success: true,
        session: encrypt(JSON.stringify(session)),
      }
    }
  } catch (error) {
    console.error("Error finding user in database:", error)
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
    // For legacy env login, ADMIN_USERNAME is always admin
    // Regular users from env are not admin
    isAdmin: user.isAdmin, // This will be true for ADMIN_USERNAME, false for others
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
