import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

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
    const user = await firestoreAdmin.users.findOne(id)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      )
    }

    if (user.isAdmin && !isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot deactivate admin user",
        },
        { status: 403 },
      )
    }

    await firestoreAdmin.users.update(id, { isActive })

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

