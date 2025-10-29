import { type NextRequest, NextResponse } from "next/server"

/**
 * Redirect route for backwards compatibility
 * The actual callback route is at /api/auth/discord/callback
 * This redirects to maintain compatibility with Discord OAuth redirect URIs
 */
export async function GET(request: NextRequest) {
  try {
    console.log("Redirect route hit: /api/auth/callback/discord")
    // Preserve the query parameters (especially the 'code' parameter)
    const searchParams = request.nextUrl.searchParams.toString()
    const redirectUrl = `/api/auth/discord/callback${searchParams ? `?${searchParams}` : ""}`
    
    console.log("Redirecting to:", redirectUrl)
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error("Redirect route error:", error)
    return NextResponse.json(
      { error: "Redirect failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

