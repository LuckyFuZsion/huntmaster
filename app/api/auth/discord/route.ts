import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("Starting Discord OAuth process")

    // Check if this is a request from the browser extension
    const isExtension = request.nextUrl.searchParams.get("extension") === "true"

    // Get Discord credentials from environment variables
    // Check both DISCORD_CLIENT_ID and NEXT_PUBLIC_DISCORD_CLIENT_ID
    // Strip quotes if present (some .env parsers include them)
    const clientIdRaw = process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    const clientId = clientIdRaw?.replace(/^["']|["']$/g, "") || undefined
    
    // For redirect URI, check multiple possible env var names
    // Must match exactly what's configured in Discord Developer Portal
    // Strip quotes if present
    // NOTE: We do NOT modify the redirect URI for extension requests
    // Discord requires exact match, so we'll detect extension in callback via state parameter
    const baseUrlRaw = process.env.NEXT_PUBLIC_APP_URL?.replace(/^["']|["']$/g, "") || "http://localhost:3000"
    const redirectUriRaw = process.env.DISCORD_REDIRECT_URI || 
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || 
      `${baseUrlRaw}/api/auth/callback/discord`
    const redirectUri = redirectUriRaw.replace(/^["']|["']$/g, "")

    if (!clientId) {
      console.error("DISCORD_CLIENT_ID or NEXT_PUBLIC_DISCORD_CLIENT_ID not set in environment variables")
      const baseUrlRaw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const baseUrl = baseUrlRaw.replace(/^["']|["']$/g, "")
      return NextResponse.redirect(`${baseUrl}/login?error=Discord+configuration+error`)
    }

    // Log what we're using (for debugging)
    console.log("=== Discord OAuth Debug ===")
    console.log("DISCORD_CLIENT_ID from env:", process.env.DISCORD_CLIENT_ID ? "SET" : "NOT SET")
    console.log("NEXT_PUBLIC_DISCORD_CLIENT_ID from env:", process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ? "SET" : "NOT SET")
    console.log("Using client ID:", clientId)
    console.log("Expected client ID (WebFuZsion): 1353872102662602804")
    console.log("Match?", clientId === "1353872102662602804" ? "YES ✅" : "NO ❌")
    console.log("Using redirect URI:", redirectUri)
    console.log("========================")

    // Construct the authorization URL - request email scope as well
    // If extension request, add state parameter to identify it
    const state = isExtension ? 'extension=true' : undefined
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify email${state ? `&state=${encodeURIComponent(state)}` : ''}`

    console.log("Auth URL (without sensitive info):", authUrl)

    // Redirect to Discord
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Error initiating Discord OAuth:", error)
    const baseUrlRaw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const baseUrl = baseUrlRaw.replace(/^["']|["']$/g, "")
    return NextResponse.redirect(`${baseUrl}/login?error=Failed+to+initiate+Discord+login`)
  }
}
