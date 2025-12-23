"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { decrypt } from "@/lib/protection"
import { ArrowLeft, Play, Loader2 } from "lucide-react"

export default function TestTsScraper() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [maxSlots, setMaxSlots] = useState(200) // Changed from 30 to 200
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is admin
    const session = localStorage.getItem("huntmaster_session")
    if (!session) {
      router.push("/login")
      return
    }

    try {
      const sessionData = JSON.parse(decrypt(session))
      if (!sessionData.isAdmin) {
        router.push("/dashboard")
        return
      }
      setIsAdmin(true)
      setLoading(false)
    } catch (err) {
      console.error("Error checking admin status:", err)
      router.push("/login")
    }
  }, [router])

  const runScraper = async () => {
    setIsRunning(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/test-ts-scraper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxSlots: maxSlots,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || "Failed to run scraper")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run scraper")
    } finally {
      setIsRunning(false)
    }
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Test TS Scraper</h1>
            <p className="text-gray-300">Test the TypeScript scraper with configurable limits</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-blue-950 to-blue-900 border-blue-800">
          <CardHeader>
            <CardTitle className="text-white">Scraper Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Slots to Parse
              </label>
              <Input
                type="number"
                value={maxSlots}
                onChange={(e) => setMaxSlots(parseInt(e.target.value) || 200)}
                min={1}
                max={1000}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                Maximum number of slots to parse (default: 200, previously 30)
              </p>
            </div>

            <Button
              onClick={runScraper}
              disabled={isRunning}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Scraper...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Scraper
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mt-6 bg-red-500/20 border-red-500/50 text-red-200">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card className="mt-6 bg-gradient-to-br from-green-950 to-green-900 border-green-800">
            <CardHeader>
              <CardTitle className="text-white">Scraper Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-sm text-gray-300">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

