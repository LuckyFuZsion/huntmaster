import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import bcrypt from "bcryptjs"

export async function POST() {
  try {
    const migratedUsers: string[] = []
    const skippedUsers: string[] = []
    const errors: string[] = []

    // Get all users from environment variables
    const envUsers = [
      // Admin user
      {
        username: process.env.ADMIN_USERNAME?.trim(),
        password: process.env.ADMIN_PASSWORD?.trim(),
        isAdmin: true,
      },
      // Regular users (USER1 through USER10)
      ...Array.from({ length: 10 }, (_, i) => {
        const userNumber = i + 1
        return {
          username: process.env[`USER${userNumber}_USERNAME`]?.trim(),
          password: process.env[`USER${userNumber}_PASSWORD`]?.trim(),
          isAdmin: false,
        }
      }),
    ].filter((user) => user.username && user.password) // Only include users with both username and password

    console.log(`Found ${envUsers.length} users in environment variables`)

    // Migrate each user
    for (const envUser of envUsers) {
      try {
        // Check if user already exists
        const existingUser = await firestoreAdmin.users.findByUsername(envUser.username)

        if (existingUser) {
          skippedUsers.push(envUser.username)
          console.log(`Skipped ${envUser.username} - already exists`)
          continue
        }

        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(envUser.password, 10)

        // Create user in Firestore
        await firestoreAdmin.users.create({
          username: envUser.username,
          password: hashedPassword,
          isAdmin: envUser.isAdmin,
          createdAt: new Date(),
        })

        migratedUsers.push(envUser.username)
        console.log(`Migrated ${envUser.username}`)
      } catch (error) {
        const errorMsg = `Failed to migrate ${envUser.username}: ${error instanceof Error ? error.message : "Unknown error"}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${migratedUsers.length} migrated, ${skippedUsers.length} skipped`,
      migratedUsers,
      skippedUsers,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: envUsers.length,
    })
  } catch (error) {
    console.error("Error migrating users:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    })
  }
}

