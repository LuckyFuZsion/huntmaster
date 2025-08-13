import { sql } from "@vercel/postgres"
import { encrypt } from "@/lib/protection"

export const runtime = "edge"

export async function POST() {
  try {
    // Create admin user
    await sql`
      INSERT INTO users (username, password, is_admin)
      VALUES ('admin', ${encrypt("admin123")}, true)
      ON CONFLICT (username) DO NOTHING
    `

    // Create regular user
    await sql`
      INSERT INTO users (username, password, is_admin)
      VALUES ('user', ${encrypt("user123")}, false)
      ON CONFLICT (username) DO NOTHING
    `

    return new Response("Users created successfully", { status: 200 })
  } catch (error) {
    console.error("Error creating users:", error)
    return new Response("Failed to create users", { status: 500 })
  }
}
