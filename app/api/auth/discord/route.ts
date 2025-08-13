import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Starting Discord OAuth process")

    // Hardcode everything for maximum reliability
    const clientId = "1354959498489630912"
    const redirectUri = "https://huntmaster.vercel.app/api/auth/discord/callback"

    // Log what we're using
    console.log("Using client ID:", clientId)
    console.log("Using redirect URI:", redirectUri)

    // Construct the authorization URL
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`

    console.log("Auth URL (without sensitive info):", authUrl)

    // Redirect to Discord
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Error initiating Discord OAuth:", error)
    return NextResponse.redirect("https://huntmaster.vercel.app/login?error=Failed+to+initiate+Discord+login")
  }
}

