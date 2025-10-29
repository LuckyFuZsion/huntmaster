import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET() {
  try {
    // Test Firestore connection by attempting to list users
    await firestoreAdmin.users.findAll()
    return NextResponse.json({ success: true, message: "Firestore connection successful" })
  } catch (error) {
    console.error("Firestore connection error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ success: false, error: errorMessage })
  }
}
