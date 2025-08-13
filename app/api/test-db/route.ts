import { NextResponse } from "next/server"
import { encrypt } from "@/lib/protection"

export const runtime = "edge"

export async function GET() {
  try {
    // Get users from environment variables
    const users = [
      {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        isAdmin: true,
      },
      {
        username: process.env.USER1_USERNAME,
        password: process.env.USER1_PASSWORD,
        isAdmin: false,
      },
      {
        username: process.env.USER2_USERNAME,
        password: process.env.USER2_PASSWORD,
        isAdmin: false,
      },
    ].filter((user) => user.username && user.password) // Only include users with both username and password set

    return NextResponse.json({
      status: "Connected",
      userCount: users.length,
      users: users.map((user) => ({
        username: user.username,
        isAdmin: user.isAdmin,
        storedPassword: encrypt(user.password || ""),
        passwordLength: user.password?.length || 0,
      })),
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({
      status: "Error",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

