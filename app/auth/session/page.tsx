"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function SessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const session = searchParams.get("session")

    if (session) {
      // Store the session in localStorage
      localStorage.setItem("huntmaster_session", session)

      // Redirect to dashboard
      router.push("/dashboard")
    } else {
      // If no session, redirect to login
      router.push("/login?error=No+session+provided")
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Logging you in...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  )
}

