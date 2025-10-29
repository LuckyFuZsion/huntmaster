import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET() {
  try {
    const users = await firestoreAdmin.users.findAll()
    
    // Sort by created date and remove password
    const sortedUsers = users.sort((a, b) => {
      const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt?.toDate?.() || 0)
      const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt?.toDate?.() || 0)
      return bDate.getTime() - aDate.getTime()
    }).map(({ password, ...user }) => user)

    return NextResponse.json({
      success: true,
      users: sortedUsers,
    })
  } catch (error) {
    console.error("List users error:", error)
    return NextResponse.json({
      success: false,
      error: "An error occurred fetching users",
    })
  }
}
