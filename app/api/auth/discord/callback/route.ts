import { type NextRequest, NextResponse } from "next/server"
import { encrypt } from "@/lib/protection"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { firestoreAdmin } from "@/lib/firestore-admin" // Fallback only

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
    // Check host header first to detect localhost
    const host = request.headers.get("host") || ""
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0")
    
    // For localhost, always use localhost URL
    let baseUrl: string
    if (isLocalhost) {
      const port = host.includes(":") ? host.split(":")[1] : "3000"
      baseUrl = `http://localhost:${port}`
    } else {
      // For production, use NEXT_PUBLIC_APP_URL or construct from host
      const appUrlRaw = process.env.NEXT_PUBLIC_APP_URL || ""
      const appUrl = appUrlRaw.replace(/^["']|["']$/g, "") || undefined
      const protocol = "https"
      baseUrl = appUrl || `${protocol}://${host}`
    }
    
    console.log("Base URL determined:", baseUrl, "Host:", host, "Is localhost:", isLocalhost)
    
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

    // Get the code and state from the URL
    const code = request.nextUrl.searchParams.get("code")
    const state = request.nextUrl.searchParams.get("state")
    
    // Check if this is a request from the browser extension (via state parameter)
    const isExtension = state === "extension=true"

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

    // Helper function to check if Supabase is available
    async function checkSupabaseAvailable(): Promise<boolean> {
      try {
        await supabaseAdmin.users.findAll()
        return true
      } catch {
        return false
      }
    }

    // Use Supabase only (no Firestore fallback to avoid quota issues)
    let user = null
    
    try {
      user = await supabaseAdmin.users.findByDiscordId(userData.id)
    } catch (supabaseError: any) {
      // If Supabase fails, don't fallback to Firestore (hits quota)
      // Instead, return a helpful error
      console.error("Supabase error when looking up user by Discord ID:", supabaseError)
      if (supabaseError?.code === '42P01' || supabaseError?.message?.includes('does not exist')) {
        // Table doesn't exist - need to run SQL setup
        return NextResponse.redirect(`${baseUrl}/login?error=Supabase+table+not+found.+Please+run+the+SQL+setup.`)
      }
      // Other Supabase error
      throw new Error(`Supabase error: ${supabaseError?.message || supabaseError}`)
    }

    // Prepare user update/create data with email
    const email = userData.email || undefined

    // Prepare update data that might be needed
    const updateData: { username?: string; discordId: string; email?: string; huntmaster?: boolean; isActive?: boolean } = { discordId: userData.id }
    if (email) {
      updateData.email = email
    }

    if (!user) {
      // Use the display name (global_name) for the username field
      const username = displayName
      let existingUserByUsername = null
      
      // Try Supabase only
      try {
        existingUserByUsername = await supabaseAdmin.users.findByUsername(username)
      } catch (supabaseError: any) {
        console.error("Supabase error when looking up user by username:", supabaseError)
        // Don't fallback - just continue to create new user
      }

      if (existingUserByUsername) {
        // Update existing user with Discord ID and email
        try {
          await supabaseAdmin.users.update(existingUserByUsername.id, updateData)
          user = { ...existingUserByUsername, ...updateData }
          console.log("Updated existing user with Discord ID:", user.username)
        } catch (updateError: any) {
          console.error("Failed to update user in Supabase:", updateError)
          throw new Error(`Failed to update user: ${updateError?.message || updateError}`)
        }
      } else {
        // Create new user - inactive by default (needs admin approval)
        try {
          user = await supabaseAdmin.users.create({
            username,
            isAdmin: false,
            huntmasterAdmin: false,
            discordId: userData.id,
            email,
            isActive: false, // New users are inactive until activated by admin
            huntmaster: false, // New Discord users don't get HuntMaster access automatically
            createdAt: new Date(),
          })
          console.log("Created new user in Supabase from Discord:", user.username, email ? `with email ${email}` : "without email")
        } catch (createError: any) {
          console.error("Failed to create user in Supabase:", createError)
          if (createError?.code === '42P01' || createError?.message?.includes('does not exist')) {
            return NextResponse.redirect(`${baseUrl}/login?error=Supabase+table+not+found.+Please+run+the+SQL+setup.`)
          }
          throw new Error(`Failed to create user: ${createError?.message || createError}`)
        }
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
      
      // Restore authorization for existing Discord users
      // If they were previously authorized (or are existing users), grant access
      if (!user.huntmaster || !user.isActive) {
        // For existing Discord users, grant authorization automatically
        // This ensures existing authorized users don't lose access
        updateData.huntmaster = true
        updateData.isActive = true
        needsUpdate = true
        console.log(`Restoring authorization for existing Discord user: ${user.username}`)
      }
      
      if (needsUpdate) {
        try {
          await supabaseAdmin.users.update(user.id, updateData)
          user = { ...user, ...updateData }
          console.log("Updated existing user with latest Discord info:", user.username)
        } catch (updateError: any) {
          console.error("Failed to update user in Supabase:", updateError)
          throw new Error(`Failed to update user: ${updateError?.message || updateError}`)
        }
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

    // Check if user's plan has expired - admins are exempt from plan expiration
    if (!user.isAdmin && user.planExpiresAt) {
      const expirationDate = new Date(user.planExpiresAt)
      const now = new Date()
      
      if (expirationDate < now) {
        // Plan expired - redirect to login with error message
        const errorMessage = "Your subscription plan has expired. Please contact an administrator to renew your access."
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(errorMessage)}&planExpired=true`)
      }
    }

    // Create session with actual user data (user is active)
    // Use huntmasterAdmin for HuntMaster admin access (separate from main app admin)
    const session = {
      userId: user.id,
      username: user.username,
      isAdmin: user.huntmasterAdmin ?? user.isAdmin ?? false, // Use HuntMaster admin flag
      discordId: user.discordId,
      isActive: true,
      timestamp: Date.now(),
    }

    // Encrypt the session
    const encryptedSession = encrypt(JSON.stringify(session))

    // If this is from the browser extension, return session via postMessage
    if (isExtension) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Discord Login Successful</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
              color: #ffffff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            h1 {
              color: #10b981;
              margin-bottom: 10px;
            }
            p {
              color: #8b9dc3;
              margin-top: 10px;
            }
          </style>
          <script>
            console.log('[Discord Callback] Extension login detected');
            console.log('[Discord Callback] window.opener:', window.opener ? 'exists' : 'null');
            console.log('[Discord Callback] window.location.origin:', window.location.origin);
            
            // Store session in localStorage for extension to read
            const sessionToken = "${encryptedSession.replace(/"/g, '\\"')}";
            
            // Store in localStorage (extension will read this)
            localStorage.setItem("huntmaster_session", sessionToken);
            
            // Show success message - DO NOT REDIRECT for extension
            document.body.innerHTML = '<h1>✓ Login Successful!</h1><p>The extension will close this window automatically.</p>';
            
            // Extension will close the window programmatically
          </script>
        </head>
        <body>
          <h1>Login Successful!</h1>
          <p>You can close this window.</p>
        </body>
        </html>
      `
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    }

    // Regular web flow - create an HTML page to store the session
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
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0")
    
    let baseUrl: string
    if (isLocalhost) {
      const port = host.includes(":") ? host.split(":")[1] : "3000"
      baseUrl = `http://localhost:${port}`
    } else {
      const appUrlRaw = process.env.NEXT_PUBLIC_APP_URL || ""
      const appUrl = appUrlRaw.replace(/^["']|["']$/g, "") || undefined
      baseUrl = appUrl || `https://${host}`
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(errorMessage)}`)
  }
}
