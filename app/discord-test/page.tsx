"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function DiscordTestPage() {
  const [debugInfo, setDebugInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchDebugInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/discord-debug")
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error("Error fetching debug info:", error)
      setDebugInfo({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const startDiscordAuth = () => {
    window.location.href = "/api/auth/discord"
  }

  return (
    <div className="container mx-auto py-10 bg-gray-900 min-h-screen">
      <Card className="max-w-md mx-auto bg-gray-800 text-white border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Discord Authentication Test</CardTitle>
          <CardDescription className="text-gray-300">Test your Discord OAuth configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Test Options</h3>
            <p className="text-gray-300">
              Use these options to test different parts of the Discord authentication flow.
            </p>
          </div>

          <div className="space-y-2">
            <Button onClick={fetchDebugInfo} disabled={loading} className="w-full bg-gray-700 hover:bg-gray-600">
              {loading ? "Loading..." : "Fetch Debug Info"}
            </Button>

            {debugInfo && (
              <div className="bg-gray-900 p-4 rounded-md">
                <pre className="text-xs text-gray-300 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={startDiscordAuth} className="w-full bg-[#5865F2] hover:bg-[#4752C4]">
            Start Discord Authentication
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

