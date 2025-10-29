import admin from "firebase-admin"

// Initialize Firebase Admin (for server-side operations)
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log("Firebase Admin initialized with service account key")
    } else {
      // Fallback to environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
        })
        console.log("Firebase Admin initialized with environment variables")
      } else {
        console.warn("Firebase Admin credentials not found in environment variables")
      }
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
  }
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
export default admin

