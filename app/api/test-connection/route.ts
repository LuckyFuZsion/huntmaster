import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET() {
  try {
    // Test Firestore connection
    const users = await firestoreAdmin.users.findAll()
    
    // Check for admin user
    const admins = users.filter(u => u.isAdmin)

    return NextResponse.json({
      success: true,
      message: "Firestore connection successful",
      timestamp: new Date().toISOString(),
      totalUsers: users.length,
      hasAdmin: admins.length > 0,
      database: "Firestore (Firebase)",
      collections: ["users", "bonuses", "hunts"],
    })
  } catch (error) {
    console.error("Firestore connection error:", error)
    return NextResponse.json({
      success: false,
      error: "Firestore connection failed",
      details: error instanceof Error ? error.message : "Unknown error",
      database: "Firestore (Firebase)",
    })
  }
}
