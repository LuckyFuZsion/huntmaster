"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Set temporary admin session and redirect
    localStorage.setItem(
      "huntmaster_session",
      "eyJ1c2VybmFtZSI6IkFkbWluMiIsInVzZXJJZCI6OTk5LCJpc0FkbWluIjp0cnVlLCJ0aW1lc3RhbXAiOjE3NDA3NDAzMDAyMzl9",
    )
    router.push("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Huntmaster Login</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Setting up temporary admin access...</div>
        </CardContent>
      </Card>
    </div>
  )
}

