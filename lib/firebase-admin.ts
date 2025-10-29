import admin from "firebase-admin"

// Initialize Firebase Admin (for server-side operations)
if (!admin.apps.length) {
  try {
    // Check if FIREBASE_SERVICE_ACCOUNT_KEY exists
    const serviceAccountKeyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    console.log("FIREBASE_SERVICE_ACCOUNT_KEY exists:", !!serviceAccountKeyRaw)
    console.log("FIREBASE_SERVICE_ACCOUNT_KEY length:", serviceAccountKeyRaw?.length || 0)
    
    let serviceAccount
    if (serviceAccountKeyRaw) {
      try {
        // Remove any surrounding quotes if present
        const cleaned = serviceAccountKeyRaw.trim().replace(/^["']|["']$/g, "")
        serviceAccount = JSON.parse(cleaned)
        console.log("Successfully parsed FIREBASE_SERVICE_ACCOUNT_KEY")
      } catch (parseError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON:", parseError)
        console.error("First 100 chars of key:", serviceAccountKeyRaw?.substring(0, 100))
        console.error("Last 100 chars of key:", serviceAccountKeyRaw?.substring(Math.max(0, (serviceAccountKeyRaw?.length || 0) - 100)))
        serviceAccount = undefined
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log("Firebase Admin initialized with service account key")
    } else {
      // Fallback to environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")?.replace(/^["']|["']$/g, "")
      
      // Strip quotes from individual env vars too
      const projectId = process.env.FIREBASE_PROJECT_ID?.replace(/^["']|["']$/g, "")
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^["']|["']$/g, "")
      
      console.log("FIREBASE_PROJECT_ID:", projectId ? "SET" : "NOT SET")
      console.log("FIREBASE_CLIENT_EMAIL:", clientEmail ? "SET" : "NOT SET")
      console.log("FIREBASE_PRIVATE_KEY:", privateKey ? "SET" : "NOT SET")
      
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
        console.log("Firebase Admin initialized with environment variables")
      } else {
        const errorMsg = "Firebase Admin credentials not found in environment variables"
        console.error(errorMsg)
        console.error("Available FIREBASE env vars:", {
          hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
          hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
          hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        })
        throw new Error(errorMsg)
      }
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
    throw error
  }
}

// Lazy initialization - only throw error when actually used
// This allows the app to handle Firebase initialization failures gracefully
let initializationAttempted = false

function ensureInitialized() {
  if (!admin.apps.length) {
    if (!initializationAttempted) {
      const errorMsg = "Firebase Admin not initialized. Check environment variables: FIREBASE_SERVICE_ACCOUNT_KEY or (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)"
      console.error(errorMsg)
      console.error("Available FIREBASE env vars:", {
        hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      })
    }
    throw new Error("Firebase Admin not initialized")
  }
  return true
}

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    ensureInitialized()
    return admin.auth()[prop as keyof admin.auth.Auth]
  },
})

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    ensureInitialized()
    return admin.firestore()[prop as keyof admin.firestore.Firestore]
  },
})

export default admin

