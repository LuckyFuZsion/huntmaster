import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { firestoreAdmin } from "@/lib/firestore-admin"

// Get hardcoded users from environment variables
function getEnvUsers() {
  const envUsers = [
    // Admin user
    {
      id: `legacy_${process.env.ADMIN_USERNAME?.trim()}`,
      username: process.env.ADMIN_USERNAME?.trim(),
      isAdmin: true,
      isActive: true,
      huntmaster: false, // Env users don't have huntmaster access by default
      huntmasterAdmin: false,
      createdAt: new Date(),
      isLegacy: true, // Flag to identify env var users
    },
    // Generate array of 10 regular users
    ...Array.from({ length: 10 }, (_, i) => {
      const userNumber = i + 1
      const username = process.env[`USER${userNumber}_USERNAME`]?.trim()
      return {
        id: `legacy_${username}`,
        username,
        isAdmin: false,
        isActive: true,
        huntmaster: false,
        huntmasterAdmin: false,
        createdAt: new Date(),
        isLegacy: true,
      }
    }),
  ].filter((user) => user.username) // Only include users with usernames

  return envUsers
}

export async function GET() {
  try {
    // Use Supabase only (no Firestore fallback)
    let dbUsers = []
    try {
      dbUsers = await supabaseAdmin.users.findAll()
    } catch (supabaseError: any) {
      console.log("Supabase not available:", supabaseError?.message || supabaseError)
      // Continue with empty dbUsers - we'll still return env users
      dbUsers = []
    }
    
    // Get hardcoded env users (always available)
    const envUsers = getEnvUsers()
    
    // Combine database users and env users
    // Remove duplicates (if a user exists in both, prefer database version)
    const dbUsernames = new Set(
      dbUsers
        .map(u => u.username?.toLowerCase().trim())
        .filter(Boolean) // Remove undefined/null values
    )
    
    const uniqueEnvUsers = envUsers.filter(u => {
      const usernameLower = u.username?.toLowerCase().trim()
      return usernameLower && !dbUsernames.has(usernameLower)
    })
    
    const allUsers = [...dbUsers, ...uniqueEnvUsers]
    
    // Sort users by username
    const sortedUsers = allUsers.sort((a, b) => {
      const aName = (a.username || '').toLowerCase()
      const bName = (b.username || '').toLowerCase()
      return aName.localeCompare(bName)
    })
    
    // Remove password from response for security
    const usersWithoutPassword = sortedUsers.map(({ password, ...user }) => user)

    return NextResponse.json({
      success: true,
      users: usersWithoutPassword,
    })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    // Even on error, try to return at least env users
    try {
      const envUsers = getEnvUsers()
      const usersWithoutPassword = envUsers.map(({ password, ...user }) => user)
      return NextResponse.json({
        success: true,
        users: usersWithoutPassword,
      })
    } catch (envError) {
      return NextResponse.json({
        success: false,
        error: error?.message || "Failed to fetch users",
      }, { status: 500 })
    }
  }
}
