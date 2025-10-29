import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import bcrypt from "bcryptjs"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    const { username, password, isAdmin = false } = await request.json()

    // Check if user exists in Firestore
    const existingUser = await firestoreAdmin.users.findByUsername(username)

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: "Username already exists",
      })
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user in Firestore
    const newUser = await firestoreAdmin.users.create({
      username,
      password: hashedPassword,
      isAdmin,
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        isAdmin: newUser.isAdmin,
      },
    })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({
      success: false,
      error: "An error occurred creating user",
    })
  }
}
