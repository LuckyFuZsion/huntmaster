import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { encrypt } from "@/lib/protection"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    const { username, password, isAdmin = false } = await request.json()

    // Check if user exists
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username}
    `

    if (existingUser.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Username already exists",
      })
    }

    // Create new user
    const encryptedPassword = encrypt(password)
    const result = await sql`
      INSERT INTO users (username, password, is_admin)
      VALUES (${username}, ${encryptedPassword}, ${isAdmin})
      RETURNING id, username, is_admin
    `

    return NextResponse.json({
      success: true,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        isAdmin: result.rows[0].is_admin,
      },
    })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({
      success: false,
      error: "An error occurred creating user",
    })
  }
}

