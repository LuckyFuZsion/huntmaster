import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export const runtime = "edge"

export async function GET() {
  try {
    const result = await sql`
      SELECT id, username, is_admin, created_at 
      FROM users 
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      users: result.rows,
    })
  } catch (error) {
    console.error("List users error:", error)
    return NextResponse.json({
      success: false,
      error: "An error occurred fetching users",
    })
  }
}

