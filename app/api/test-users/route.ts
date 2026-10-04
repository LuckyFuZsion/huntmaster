import { NextResponse } from "next/server"
import { verifySession } from "@/lib/session"

export async function GET(request: Request) {
  const session = verifySession(new URL(request.url).searchParams.get("session"))
  if (!session?.isAdmin) {
    return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 })
  }
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
