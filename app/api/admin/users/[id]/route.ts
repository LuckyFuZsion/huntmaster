import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"
import { encrypt } from "@/lib/protection"

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

    // If password is provided, update it; otherwise, keep the existing password
    if (password) {
      const encryptedPassword = encrypt(password)
      await sql`
        UPDATE users
        SET username = ${username},
            password = ${encryptedPassword},
            is_admin = ${is_admin}
        WHERE id = ${id};
      `
    } else {
      await sql`
        UPDATE users
        SET username = ${username},
            is_admin = ${is_admin}
        WHERE id = ${id};
      `
    }

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
    const userCheck = await sql`
      SELECT username FROM users WHERE id = ${id};
    `

    if (userCheck.rows[0]?.username === "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete admin user",
        },
        { status: 403 },
      )
    }

    await sql`
      DELETE FROM users
      WHERE id = ${id};
    `

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

