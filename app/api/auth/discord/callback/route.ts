import { type NextRequest, NextResponse } from "next/server"
import { encrypt } from "@/lib/protection"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("Discord callback received")

    // Get Discord credentials from environment variables
    // Check both DISCORD_CLIENT_ID and NEXT_PUBLIC_DISCORD_CLIENT_ID
    // Strip quotes if present (some .env parsers include them)
    const clientIdRaw = process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    const clientId = clientIdRaw?.replace(/^["']|["']$/g, "") || undefined
    const clientSecretRaw = process.env.DISCORD_CLIENT_SECRET
    const clientSecret = clientSecretRaw?.replace(/^["']|["']$/g, "") || undefined
    
    // Determine base URL for local development vs production
    // Strip quotes from NEXT_PUBLIC_APP_URL if present
    const appUrlRaw = process.env.NEXT_PUBLIC_APP_URL || ""
    const appUrl = appUrlRaw.replace(/^["']|["']$/g, "") || undefined
    const host = request.headers.get("host") || ""
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https"
    const baseUrl = appUrl || `${protocol}://${host}`
    
    // Use DISCORD_REDIRECT_URI from env if set (must match what Discord expects)
    // Check multiple possible env var names and default to /api/auth/callback/discord
    // Strip quotes if present
    const redirectUriRaw = process.env.DISCORD_REDIRECT_URI || 
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || 
      `${baseUrl}/api/auth/callback/discord`
    const redirectUri = redirectUriRaw.replace(/^["']|["']$/g, "")

    if (!clientId || !clientSecret) {
      console.error("Discord credentials not set in environment variables")
      console.error("DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "set" : "not set")
      console.error("NEXT_PUBLIC_DISCORD_CLIENT_ID:", process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ? "set" : "not set")
      console.error("DISCORD_CLIENT_SECRET:", process.env.DISCORD_CLIENT_SECRET ? "set" : "not set")
      return NextResponse.redirect(`${baseUrl}/login?error=Discord+configuration+error`)
    }

    // Get the code from the URL
    const code = request.nextUrl.searchParams.get("code")

    if (!code) {
      console.error("No code provided in callback")
      return NextResponse.redirect(`${baseUrl}/login?error=No+authorization+code+provided`)
    }

    console.log("Code received, exchanging for token")

    // Exchange the code for a token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    // Log the status code
    console.log("Token response status:", tokenResponse.status)

    // Parse the response
    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("Discord token error:", tokenData)
      console.error("Client ID used:", clientId)
      console.error("Redirect URI used:", redirectUri)
      console.error("Status:", tokenResponse.status)
      const errorDetails = tokenData.error_description || tokenData.error || "Unknown error"
      return NextResponse.redirect(`${baseUrl}/login?error=Token+error:+${tokenResponse.status}+(${errorDetails})`)
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
      return NextResponse.redirect(`${baseUrl}/login?error=Failed+to+get+user+data`)
    }

    // Use global_name (editable display name) if available, otherwise fall back to username
    const displayName = userData.global_name || userData.username || `discord_${userData.id}`
    console.log("User data obtained:", displayName, "Email:", userData.email || "not provided")
    console.log("Discord username:", userData.username, "Global name:", userData.global_name || "not set")

    // Check if user exists by Discord ID
    let user = await firestoreAdmin.users.findByDiscordId(userData.id)

    // Prepare user update/create data with email
    const email = userData.email || undefined

    // Prepare update data that might be needed
    const updateData: { username?: string; discordId: string; email?: string } = { discordId: userData.id }
    if (email) {
      updateData.email = email
    }

    if (!user) {
      // Use the display name (global_name) for the username field
      const username = displayName
      const existingUserByUsername = await firestoreAdmin.users.findByUsername(username)

      if (existingUserByUsername) {
        // Update existing user with Discord ID and email
        await firestoreAdmin.users.update(existingUserByUsername.id, updateData)
        user = { ...existingUserByUsername, ...updateData }
        console.log("Updated existing user with Discord ID:", user.username)
      } else {
        // Create new user - inactive by default (needs admin approval)
        user = await firestoreAdmin.users.create({
          username,
          isAdmin: false,
          discordId: userData.id,
          email,
          isActive: false, // New users are inactive until activated by admin
          createdAt: new Date(),
        })
        console.log("Created new user from Discord:", user.username, email ? `with email ${email}` : "without email")
      }
    } else {
      // Update existing Discord user with latest display name and email if needed
      let needsUpdate = false
      
      // Update username if global_name has changed
      if (displayName !== user.username) {
        updateData.username = displayName
        needsUpdate = true
        console.log(`Updating username from "${user.username}" to "${displayName}"`)
      }
      
      // Update email if not already set
      if (email && !user.email) {
        updateData.email = email
        needsUpdate = true
      }
      
      if (needsUpdate) {
        await firestoreAdmin.users.update(user.id, updateData)
        user = { ...user, ...updateData }
        console.log("Updated existing user with latest Discord info:", user.username)
      } else {
        console.log("Found existing user by Discord ID:", user.username, "- no updates needed")
      }
    }

    // Check if user is active - admins are always considered active
    // For new users, isActive will be false - they need admin approval
    // Legacy users (without isActive field set) are treated as active for backwards compatibility
    // Only users with explicit isActive === false are inactive
    const isUserActive = user.isAdmin || user.isActive !== false

    if (!isUserActive) {
      // User is inactive - create a session with inactive flag but don't allow access
      const session = {
        userId: user.id,
        username: user.username,
        isAdmin: false,
        discordId: user.discordId,
        isActive: false,
        timestamp: Date.now(),
      }

      const encryptedSession = encrypt(JSON.stringify(session))

      // Return HTML with modal instead of redirecting to dashboard
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Account Access Required</title>
          <script>
            // Store the session (for modal display)
            localStorage.setItem("huntmaster_session", "${encryptedSession}");
            
            // Redirect to login with inactive flag
            window.location.href = "/login?inactive=true";
          </script>
        </head>
        <body>
          <h1>Redirecting...</h1>
        </body>
        </html>
      `

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    }

    // Create session with actual user data (user is active)
    const session = {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      discordId: user.discordId,
      isActive: true,
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
    // Determine base URL dynamically from request headers
    const host = request.headers.get("host") || ""
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https"
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(errorMessage)}`)
  }
}
