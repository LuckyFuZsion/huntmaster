import { NextResponse } from "next/server"

export async function GET() {
  try {
    const variables = [
      // Generate array for 10 users
      ...Array.from({ length: 10 }, (_, i) => {
        const userNumber = i + 1
        return [
          {
            name: `USER${userNumber}_USERNAME`,
            isSet: !!process.env[`USER${userNumber}_USERNAME`],
            length: process.env[`USER${userNumber}_USERNAME`]?.length,
          },
          {
            name: `USER${userNumber}_PASSWORD`,
            isSet: !!process.env[`USER${userNumber}_PASSWORD`],
            length: process.env[`USER${userNumber}_PASSWORD`]?.length,
          },
        ]
      }).flat(),
    ]

    // Debug info without exposing sensitive data
    const debug = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      varsPresent: variables.filter((v) => v.isSet).length,
      varsTotal: variables.length,
      userSummary: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          `USER${i + 1}`,
          {
            usernameSet: !!process.env[`USER${i + 1}_USERNAME`],
            passwordSet: !!process.env[`USER${i + 1}_PASSWORD`],
          },
        ]),
      ),
    }

    return NextResponse.json({
      success: true,
      variables,
      debug,
    })
  } catch (error) {
    console.error("Error fetching env data:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch environment data",
    })
  }
}
