import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { firestoreAdmin } from "@/lib/firestore-admin"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { username, password, isAdmin = false } = await request.json()

    // Try Supabase first, then Firestore as fallback
    let existingUser = null
    try {
      existingUser = await supabaseAdmin.users.findByUsername(username)
    } catch (supabaseError) {
      console.log("Supabase not available, checking Firestore:", supabaseError)
      existingUser = await firestoreAdmin.users.findByUsername(username)
    }

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: "Username already exists",
      })
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user in Supabase (preferred) or Firestore (fallback)
    let newUser = null
    try {
      newUser = await supabaseAdmin.users.create({
        username,
        password: hashedPassword,
        isAdmin,
        isActive: true,
        huntmaster: true, // Grant HuntMaster access
        huntmasterAdmin: isAdmin, // Set admin flag if requested
        createdAt: new Date(),
      })
      console.log("Created user in Supabase:", newUser.username)
    } catch (supabaseError) {
      console.log("Supabase creation failed, trying Firestore:", supabaseError)
      // Fallback to Firestore
      newUser = await firestoreAdmin.users.create({
        username,
        password: hashedPassword,
        isAdmin,
        createdAt: new Date(),
      })
      console.log("Created user in Firestore:", newUser.username)
    }

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
