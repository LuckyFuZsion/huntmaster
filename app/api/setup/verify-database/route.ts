import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET() {
  try {
    // Verify at least one user exists
    const users = await firestoreAdmin.users.findAll()

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No users found in Firestore",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Firestore verified successfully",
    })
  } catch (error) {
    console.error("Firestore verification error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({
      success: false,
      error: errorMessage,
    })
  }
}
