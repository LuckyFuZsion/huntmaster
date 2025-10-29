"use client"
import { BonusHuntTracker } from "@/components/bonus-hunt-tracker"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { decrypt } from "@/lib/protection"
import { VersionHistory } from "@/components/version-history"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [username, setUsername] = useState("")
  const [isRedirecting, setIsRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isRedirecting) return // Prevent multiple redirects

    try {
      const session = localStorage.getItem("huntmaster_session")
      if (!session) {
        setIsRedirecting(true)
        router.push("/login")
        return
      }

      const sessionData = JSON.parse(decrypt(session))
      if (!sessionData?.username) {
        throw new Error("Invalid session data")
      }

      setUsername(sessionData.username)
      setIsLoading(false)
    } catch (err) {
      console.error("Error decoding session:", err)
      localStorage.removeItem("huntmaster_session") // Clear invalid session
      setIsRedirecting(true)
      router.push("/login")
    }
  }, [router, isRedirecting])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">Initializing application...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
      <div className="absolute top-4 right-4">
        <VersionHistory />
      </div>
      <BonusHuntTracker />
    </div>
  )
}
