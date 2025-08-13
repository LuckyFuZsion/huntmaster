import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test basic connection
    const result = await sql`SELECT NOW()`

    // Test users table
    const usersTest = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `

    // Count users
    const userCount = await sql`
      SELECT COUNT(*) FROM users;
    `

    // Get admin user (without exposing password)
    const adminCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE is_admin = true
      );
    `

    // If we get here, connection is working
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      timestamp: result.rows[0].now,
      hasUsersTable: usersTest.rows[0].exists,
      totalUsers: userCount.rows[0].count,
      hasAdmin: adminCheck.rows[0].exists,
      databaseUrl: process.env.POSTGRES_URL ? "Set" : "Missing",
    })
  } catch (error) {
    console.error("Database connection error:", error)
    return NextResponse.json({
      success: false,
      error: "Database connection failed",
      details: error instanceof Error ? error.message : "Unknown error",
      databaseUrl: process.env.POSTGRES_URL ? "Set" : "Missing",
    })
  }
}
