import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Check if old User table exists
    const oldTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'User'
      );
    `

    if (!oldTableExists.rows[0].exists) {
      return NextResponse.json({
        success: false,
        message: "No old table found to migrate",
      })
    }

    // Get all users from old table
    const oldUsers = await sql`
      SELECT * FROM "User";
    `

    // Migrate each user to the new table
    for (const user of oldUsers.rows) {
      // Check if user already exists in new table
      const existingUser = await sql`
        SELECT id FROM users WHERE username = ${user.username};
      `

      if (existingUser.rows.length === 0) {
        await sql`
          INSERT INTO users (username, password, is_admin)
          VALUES (${user.username}, ${user.password}, ${user.is_admin || false});
        `
      }
    }

    // Optionally, rename old table to backup
    await sql`
      ALTER TABLE "User" RENAME TO "User_backup";
    `

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
    })
  } catch (error) {
    console.error("Migration error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({
      success: false,
      error: errorMessage,
    })
  }
}
