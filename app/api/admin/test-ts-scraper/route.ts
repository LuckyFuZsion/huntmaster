import { NextResponse } from "next/server"
import { decrypt } from "@/lib/protection"

// Helper to require admin session
function requireAdminSession(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    throw new Error("Unauthorized")
  }

  try {
    const session = authHeader.replace("Bearer ", "")
    const sessionData = JSON.parse(decrypt(session))
    if (!sessionData.isAdmin) {
      throw new Error("Forbidden")
    }
    return sessionData
  } catch (error) {
    throw new Error("Unauthorized")
  }
}

export async function POST(request: Request) {
  try {
    // Check admin authentication
    requireAdminSession(request)

    const { maxSlots } = await request.json()
    
    // Changed from 30 to 200 as default
    const maxSlotsToParse = maxSlots || 200
    
    if (maxSlotsToParse < 1 || maxSlotsToParse > 1000) {
      return NextResponse.json(
        { success: false, error: "maxSlots must be between 1 and 1000" },
        { status: 400 }
      )
    }

    // TODO: Implement actual scraper logic here
    // This is a placeholder that returns the configuration
    const result = {
      success: true,
      maxSlots: maxSlotsToParse,
      message: `Scraper configured to parse up to ${maxSlotsToParse} slots (changed from 30)`,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error in test-ts-scraper:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}

