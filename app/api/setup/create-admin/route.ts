import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { firestoreAdmin } from "@/lib/firestore-admin"

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

    console.log("Creating admin user with username:", username)

    // Check if admin user already exists in Firestore
    const existingUser = await firestoreAdmin.users.findByUsername(username)

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: "Admin user already exists",
      })
    }

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log("Admin user password hashed successfully")

    // Create admin user in Firestore
    await firestoreAdmin.users.create({
      username,
      password: hashedPassword,
      isAdmin: true,
      createdAt: new Date(),
    })

    console.log("Admin user created successfully in Firestore")

    return NextResponse.json({ success: true, message: "Admin user created successfully" })
  } catch (error) {
    console.error("Error creating admin user:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ success: false, error: errorMessage })
  }
}
