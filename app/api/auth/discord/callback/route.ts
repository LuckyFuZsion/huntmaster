import { type NextRequest, NextResponse } from "next/server"
import { encrypt } from "@/lib/protection"

export async function GET(request: NextRequest) {
  try {
    console.log("Discord callback received")

    // Get the code from the URL
    const code = request.nextUrl.searchParams.get("code")

    if (!code) {
      console.error("No code provided in callback")
      return NextResponse.redirect("https://huntmaster.vercel.app/login?error=No+authorization+code+provided")
    }

    console.log("Code received, exchanging for token")

    // Exchange the code for a token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: "1354959498489630912",
        client_secret: "j2uW0d1JEf5rnFoPyJyS2aHIGOJbhsucc",
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://huntmaster.vercel.app/api/auth/discord/callback",
      }),
    })

    // Log the status code
    console.log("Token response status:", tokenResponse.status)

    // Parse the response
    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("Discord token error:", tokenData)
      return NextResponse.redirect(`https://huntmaster.vercel.app/login?error=Token+error:+${tokenResponse.status}`)
    }

    console.log("Token obtained, fetching user data")

    // Get the user's information
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    // Log the status code
    console.log("User response status:", userResponse.status)

    // Parse the response
    const userData = await userResponse.json()

    if (!userResponse.ok) {
      console.error("Discord user data error:", userData)
      return NextResponse.redirect("https://huntmaster.vercel.app/login?error=Failed+to+get+user+data")
    }

    console.log("User data obtained:", userData.username)

    // Create a simple session
    const session = {
      userId: 1, // Temporary ID
      username: userData.username || `discord_${userData.id}`,
      isAdmin: false,
      discordId: userData.id,
      timestamp: Date.now(),
    }

    // Encrypt the session
    const encryptedSession = encrypt(JSON.stringify(session))

    // Create an HTML page to store the session
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Discord Login Successful</title>
        <script>
          // Store the session
          localStorage.setItem("huntmaster_session", "${encryptedSession}");
          console.log("Session stored in localStorage");
          
          // Redirect to the dashboard
          window.location.href = "/dashboard";
        </script>
      </head>
      <body>
        <h1>Login Successful!</h1>
        <p>Redirecting to dashboard...</p>
        <p>If you are not redirected, <a href="/dashboard">click here</a>.</p>
      </body>
      </html>
    `

    // Return the HTML
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    console.error("Discord callback error:", error)
    return NextResponse.redirect(`https://huntmaster.vercel.app/login?error=${encodeURIComponent(error.message)}`)
  }
}

