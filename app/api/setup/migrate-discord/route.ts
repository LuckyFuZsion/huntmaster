import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET() {
  try {
    // Add discord_id column if it doesn't exist
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;
    `

    // Create index on discord_id for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users (discord_id);
    `

    return NextResponse.json({
      success: true,
      message: "Discord migration completed successfully",
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
