import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Log all environment variables (excluding secrets)
    console.log("BASE_URL:", process.env.NEXT_PUBLIC_APP_URL || "not set")

    // Construct the redirect URI exactly as it would be used
    const redirectUri = "https://huntmaster.vercel.app/api/auth/discord/callback"

    // Log the redirect URI
    console.log("Redirect URI:", redirectUri)

    // Return debug info
    return NextResponse.json({
      status: "Debug info collected",
      redirectUri,
      clientId: "1354959498489630912",
      // Don't include client secret in response
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({ error: "Debug error occurred" }, { status: 500 })
  }
}

