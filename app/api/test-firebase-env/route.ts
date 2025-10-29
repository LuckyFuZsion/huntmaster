import { NextResponse } from "next/server"

export async function GET() {
  // Debug endpoint to check what environment variables are actually loaded
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    FIREBASE_SERVICE_ACCOUNT_KEY: {
      exists: !!serviceAccountKey,
      length: serviceAccountKey?.length || 0,
      first100Chars: serviceAccountKey?.substring(0, 100) || "N/A",
      last100Chars: serviceAccountKey?.substring(Math.max(0, (serviceAccountKey?.length || 0) - 100)) || "N/A",
    },
    FIREBASE_PROJECT_ID: {
      exists: !!process.env.FIREBASE_PROJECT_ID,
      value: process.env.FIREBASE_PROJECT_ID || "NOT SET",
    },
    FIREBASE_CLIENT_EMAIL: {
      exists: !!process.env.FIREBASE_CLIENT_EMAIL,
      value: process.env.FIREBASE_CLIENT_EMAIL || "NOT SET",
    },
    FIREBASE_PRIVATE_KEY: {
      exists: !!process.env.FIREBASE_PRIVATE_KEY,
      length: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    },
    // Try to parse the JSON to see if it's valid
    parseAttempt: (() => {
      if (!serviceAccountKey) return { success: false, error: "No key found" }
      try {
        const cleaned = serviceAccountKey.trim().replace(/^["']|["']$/g, "")
        const parsed = JSON.parse(cleaned)
        return { 
          success: true, 
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
        }
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
        }
      }
    })(),
  })
}

