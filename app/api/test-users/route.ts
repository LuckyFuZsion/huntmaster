import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get user information from environment variables
    const users = [
      {
        username: process.env.ADMIN_USERNAME,
        hasPassword: !!process.env.ADMIN_PASSWORD,
        isAdmin: true,
      },
      // Generate array of 10 regular users
      ...Array.from({ length: 10 }, (_, i) => {
        const userNumber = i + 1
        return {
          username: process.env[`USER${userNumber}_USERNAME`],
          hasPassword: !!process.env[`USER${userNumber}_PASSWORD`],
          isAdmin: false,
        }
      }),
    ]

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error) {
    console.error("Error fetching user data:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch user data",
    })
  }
}

