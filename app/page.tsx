"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { decrypt } from "@/lib/protection"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const session = localStorage.getItem("huntmaster_session")
    if (!session) {
      router.push("/login")
      return
    }

    try {
      // Verify session is valid
      const sessionData = JSON.parse(decrypt(session))
      const sessionAge = Date.now() - sessionData.timestamp
      // Session expires after 12 hours
      if (sessionAge > 12 * 60 * 60 * 1000) {
        localStorage.removeItem("huntmaster_session")
        router.push("/login")
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      localStorage.removeItem("huntmaster_session")
      router.push("/login")
    }
  }, [router])

  // Return null while redirecting
  return null
}
