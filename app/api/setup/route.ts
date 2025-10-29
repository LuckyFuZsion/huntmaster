import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET() {
  try {
    // Check if admin user exists in Firestore
    const users = await firestoreAdmin.users.findAll()
    const adminUser = users.find(user => user.isAdmin)

    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: "Admin user not found",
        needsSetup: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Firestore is properly set up",
      needsSetup: false,
    })
  } catch (error) {
    console.error("Firestore setup check error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({
      success: false,
      error: errorMessage,
      needsSetup: true,
    })
  }
}
