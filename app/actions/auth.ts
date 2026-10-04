"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { signSession } from "@/lib/session"
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
      return { error: "Invalid credentials" }
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

    // Check if user's plan has expired - admins are exempt from plan expiration
    if (!user.isAdmin && user.planExpiresAt) {
      const expirationDate = new Date(user.planExpiresAt)
      const now = new Date()
      
      if (expirationDate < now) {
        return {
          success: false,
          error: "Your subscription plan has expired. Please contact an administrator to renew your access.",
          planExpired: true,
        }
      }
    }


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
      session: signSession(session),
    }
  } catch (error) {
    console.error("Login error:", error)
    // Never fall back to a different auth path on error
    return { error: "Invalid credentials" }
  }
}

// Update the logout function to use the correct cookie API for Next.js 15
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.set("session", "", { expires: new Date(0) })
  redirect("/login")
}
