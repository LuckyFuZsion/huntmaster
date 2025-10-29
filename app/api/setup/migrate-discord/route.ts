import { NextResponse } from "next/server"

export async function GET() {
  // No-op for Firestore - no migrations needed
  return NextResponse.json({
    success: true,
    message: "No migration needed for Firestore",
  })
}
