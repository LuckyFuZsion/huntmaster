import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import bcrypt from "bcryptjs"

export async function POST() {
  try {
    // Check if users already exist
    const existingUsers = await firestoreAdmin.users.findAll()
    
    // Create admin user if doesn't exist
    const adminExists = existingUsers.find(u => u.username === "admin")
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10)
      await firestoreAdmin.users.create({
        username: "admin",
        password: hashedPassword,
        isAdmin: true,
        createdAt: new Date(),
      })
    }

    // Create regular user if doesn't exist
    const userExists = existingUsers.find(u => u.username === "user")
    if (!userExists) {
      const hashedPassword = await bcrypt.hash("user123", 10)
      await firestoreAdmin.users.create({
        username: "user",
        password: hashedPassword,
        isAdmin: false,
        createdAt: new Date(),
      })
    }

    return NextResponse.json({ success: true, message: "Users created successfully" })
  } catch (error) {
    console.error("Error creating users:", error)
    return NextResponse.json({ success: false, error: "Failed to create users" }, { status: 500 })
  }
}
