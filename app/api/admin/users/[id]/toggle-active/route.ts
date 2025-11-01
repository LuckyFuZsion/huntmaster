import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { firestoreAdmin } from "@/lib/firestore-admin"

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

export async function PATCH(request: Request) {
  try {
    // Extract ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/")
    const id = pathParts[pathParts.length - 2] // Second to last part, before "toggle-active"

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 },
      )
    }

    const { isActive } = await request.json()

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "isActive must be a boolean",
        },
        { status: 400 },
      )
    }

    // Check if user is admin - admins cannot be deactivated
    const user = await getUserAdmin(id)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      )
    }

    // Check both isAdmin and huntmasterAdmin
    const isAdminUser = user.isAdmin || user.huntmasterAdmin
    if (isAdminUser && !isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot deactivate admin user",
        },
        { status: 403 },
      )
    }

    await updateUser(id, { isActive })

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    })
  } catch (error) {
    console.error("Error toggling user active status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user status",
      },
      { status: 500 },
    )
  }
}

