import { NextResponse } from "next/server"

export async function GET() {
  // Test endpoint to check if Firebase credentials are available
  return NextResponse.json({
    hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    serviceAccountKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    checkResult: {
      usingServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      usingIndividualVars: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
    },
  })
}

