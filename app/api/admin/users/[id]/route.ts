import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { firestoreAdmin } from "@/lib/firestore-admin"
import bcrypt from "bcryptjs"

async function getUserAdmin(id: string) {
  try {
    return await supabaseAdmin.users.findOne(id)
  } catch {
    return await firestoreAdmin.users.findOne(id)
  }
}

async function updateUser(id: string, updateData: any) {
  try {
    await supabaseAdmin.users.update(id, updateData)
  } catch {
    await firestoreAdmin.users.update(id, updateData)
  }
}

async function deleteUser(id: string) {
  try {
    await supabaseAdmin.users.delete(id)
  } catch {
    await firestoreAdmin.users.delete(id)
  }
}

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

    const { username, password, is_admin, huntmaster, huntmaster_admin, planExpiresAt } = await request.json()

    // Build update data
    const updateData: any = {
      username,
      isAdmin: is_admin,
    }

    // Handle HuntMaster-specific fields
    if (huntmaster !== undefined) {
      updateData.huntmaster = huntmaster
    }
    if (huntmaster_admin !== undefined) {
      updateData.huntmasterAdmin = huntmaster_admin
    }

    // Handle plan expiration
    if (planExpiresAt !== undefined) {
      updateData.planExpiresAt = planExpiresAt === null || planExpiresAt === "" 
        ? null 
        : new Date(planExpiresAt).toISOString()
    }

    // If password is provided, hash and update it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    await updateUser(id, updateData)

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
    const user = await getUserAdmin(id)

    if (user?.username === "admin" || user?.username === process.env.ADMIN_USERNAME) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete admin user",
        },
        { status: 403 },
      )
    }

    await deleteUser(id)

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
