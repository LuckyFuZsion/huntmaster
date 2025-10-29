import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET() {
  try {
    const users = await firestoreAdmin.users.findAll()
    
    // Sort users by username
    const sortedUsers = users.sort((a, b) => a.username.localeCompare(b.username))
    
    // Remove password from response for security
    const usersWithoutPassword = sortedUsers.map(({ password, ...user }) => user)

    return NextResponse.json({
      success: true,
      users: usersWithoutPassword,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch users",
    })
  }
}
