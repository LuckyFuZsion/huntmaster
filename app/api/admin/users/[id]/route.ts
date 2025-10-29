import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import bcrypt from "bcryptjs"

export async function PUT(request: Request) {
  try {
    // Extract ID from URL
    const url = new URL(request.url)
    const id = url.pathname.split("/").pop()

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 },
      )
    }

    const { username, password, is_admin } = await request.json()

    // Build update data
    const updateData: any = {
      username,
      isAdmin: is_admin,
    }

    // If password is provided, hash and update it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    await firestoreAdmin.users.update(id, updateData)

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    // Extract ID from URL
    const url = new URL(request.url)
    const id = url.pathname.split("/").pop()

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 },
      )
    }

    // Check if user is admin
    const user = await firestoreAdmin.users.findOne(id)

    if (user?.username === "admin" || user?.username === process.env.ADMIN_USERNAME) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete admin user",
        },
        { status: 403 },
      )
    }

    await firestoreAdmin.users.delete(id)

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete user",
      },
      { status: 500 },
    )
  }
}
