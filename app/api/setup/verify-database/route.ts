import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test connection
    await sql`SELECT NOW()`

    // Verify User table exists and has correct structure
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `

    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({
        success: false,
        error: "User table not found in database",
      })
    }

    // Verify table structure
    const columnCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `

    const requiredColumns = {
      username: "character varying",
      password: "character varying",
      is_admin: "boolean",
    }

    const hasAllColumns = Object.entries(requiredColumns).every(([column, type]) =>
      columnCheck.rows.some((row) => row.column_name === column && row.data_type === type),
    )

    if (!hasAllColumns) {
      return NextResponse.json({
        success: false,
        error: "User table structure is incorrect",
      })
    }

    // Verify at least one user exists
    const userCheck = await sql`SELECT COUNT(*) FROM "users";`

    if (userCheck.rows[0].count === "0") {
      return NextResponse.json({
        success: false,
        error: "No users found in database",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Database verified successfully",
    })
  } catch (error) {
    console.error("Database verification error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({
      success: false,
      error: errorMessage,
    })
  }
}

