import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"
import { encrypt } from "@/lib/protection"

export async function POST() {
  try {
    const username = process.env.ADMIN_USERNAME
    const password = process.env.ADMIN_PASSWORD

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: "Admin credentials not found in environment variables",
      })
    }

    // Add after the environment variable check:
    console.log("Creating admin user with username:", username)

    // Check if admin user already exists
    const existingUser = await sql`
    SELECT "id" FROM "users" WHERE "username" = ${username};
`

    if (existingUser.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Admin user already exists",
      })
    }

    // Encrypt password using our custom encryption
    const encryptedPassword = encrypt(password)

    // Add after the encryption:
    console.log("Admin user password encrypted successfully")

    // Create admin user
    await sql`
    INSERT INTO "users" ("username", "password", "is_admin")
    VALUES (${username}, ${encryptedPassword}, TRUE);
`

    // Add before the final return:
    console.log("Admin user created successfully in database")

    return NextResponse.json({ success: true, message: "Admin user created successfully" })
  } catch (error) {
    console.error("Error creating admin user:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ success: false, error: errorMessage })
  }
}
