import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await sql`SELECT NOW()`
    return NextResponse.json({ success: true, message: "Database connection successful" })
  } catch (error) {
    console.error("Database connection error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ success: false, error: errorMessage })
  }
}

