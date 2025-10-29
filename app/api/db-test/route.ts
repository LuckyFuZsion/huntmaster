import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET() {
  try {
    // Test Firestore connection
    console.log("Testing Firestore connection...")
    const users = await firestoreAdmin.users.findAll()
    console.log("Firestore test result: Found", users.length, "users")

    // Return test results
    return NextResponse.json({
      connection: "success",
      firestore: "connected",
      userCount: users.length,
      database: "Firestore",
    })
  } catch (error) {
    console.error("Firestore test error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        database: "Firestore",
      },
      {
        status: 500,
      },
    )
  }
}
