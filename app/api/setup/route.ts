import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check database connection
    await sql`SELECT NOW()`

    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'sessions', 'bonus_hunts', 'slots');
    `

    const requiredTables = ["users", "sessions", "bonus_hunts", "slots"]
    const existingTables = tables.rows.map((row) => row.table_name)
    const missingTables = requiredTables.filter((table) => !existingTables.includes(table))

    if (missingTables.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing tables: ${missingTables.join(", ")}`,
        needsSetup: true,
      })
    }

    // Check if admin user exists
    const adminUser = await sql`
      SELECT "id" FROM "users" WHERE "is_admin" = TRUE LIMIT 1;
    `

    if (adminUser.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Admin user not found",
        needsSetup: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Database is properly set up",
      needsSetup: false,
    })
  } catch (error) {
    console.error("Database setup check error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({
      success: false,
      error: errorMessage,
      needsSetup: true,
    })
  }
}
