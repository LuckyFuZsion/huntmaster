"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { encrypt } from "@/lib/protection"
import { useRouter } from "next/navigation"

export default function DebugPage() {
  const [session, setSession] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const storedSession = localStorage.getItem("huntmaster_session")
    setSession(storedSession)

    if (storedSession) {
      try {
        // This is just for display purposes, we don't have decrypt here
        setSessionData(JSON.stringify(storedSession))
      } catch (error) {
        setSessionData("Error parsing session")
      }
    }
  }, [])

  const createTestSession = () => {
    const testSession = {
      userId: 1,
      username: "test_user",
      isAdmin: false,
      timestamp: Date.now(),
    }

    const encryptedSession = encrypt(JSON.stringify(testSession))
    localStorage.setItem("huntmaster_session", encryptedSession)
    setSession(encryptedSession)
    setSessionData(JSON.stringify(testSession))
  }

  const clearSession = () => {
    localStorage.removeItem("huntmaster_session")
    setSession(null)
    setSessionData(null)
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Session Status:</h2>
            <p className={session ? "text-green-500" : "text-red-500"}>
              {session ? "Session found in localStorage" : "No session found in localStorage"}
            </p>
            {sessionData && (
              <div className="mt-2">
                <h3 className="text-md font-semibold">Session Data:</h3>
                <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">{sessionData}</pre>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <Button onClick={createTestSession}>Create Test Session</Button>
            <Button variant="destructive" onClick={clearSession}>
              Clear Session
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go To Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
