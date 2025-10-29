import { NextResponse } from "next/server"

export async function GET() {
  // Debug endpoint to check what environment variables are actually loaded
  return NextResponse.json({
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ? "SET" : "NOT SET",
    DISCORD_CLIENT_ID_VALUE: process.env.DISCORD_CLIENT_ID || "NOT SET",
    NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ? "SET" : "NOT SET",
    NEXT_PUBLIC_DISCORD_CLIENT_ID_VALUE: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "NOT SET",
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? "SET (hidden)" : "NOT SET",
    DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || "NOT SET",
    NEXT_PUBLIC_DISCORD_REDIRECT_URI: process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || "NOT SET",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
    selectedClientId: process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "NOT SET",
    expectedClientId: "1353872102662602804",
    isCorrect: (process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) === "1353872102662602804",
  })
}

