import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const result = await sql`
      SELECT id, username, is_admin
      FROM users
      ORDER BY username;
    `

    return NextResponse.json({
      success: true,
      users: result.rows,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch users",
    })
  }
}
