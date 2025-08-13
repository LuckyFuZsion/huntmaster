"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

export default function TestUser3Env() {
  const [envInfo, setEnvInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Get USER3 environment variable information
    const user3Info = {
      username: {
        exists: !!process.env.NEXT_PUBLIC_USER3_USERNAME,
        value: process.env.NEXT_PUBLIC_USER3_USERNAME,
      },
      password: {
        exists: !!process.env.USER3_PASSWORD,
        length: process.env.USER3_PASSWORD?.length,
      },
    }

    setEnvInfo(user3Info)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">USER3 Environment Variables Test</CardTitle>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert className="bg-destructive/20 border-destructive text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">USER3 Environment Variables Status:</h3>
                <ul className="space-y-2">
                  <li>
                    USERNAME: {envInfo?.username.exists ? "Set" : "Not Set"}
                    {envInfo?.username.exists && ` (Value: ${envInfo.username.value})`}
                  </li>
                  <li>
                    PASSWORD: {envInfo?.password.exists ? "Set" : "Not Set"}
                    {envInfo?.password.exists && ` (Length: ${envInfo.password.length})`}
                  </li>
                </ul>
              </div>

              <Alert className="bg-blue-500/20 border-blue-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Debugging Steps</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Verify both USER3_USERNAME and USER3_PASSWORD are set in your environment</li>
                    <li>Make sure there are no extra spaces in the username or password</li>
                    <li>Check that the case (uppercase/lowercase) matches exactly</li>
                    <li>Try clearing your browser's local storage and logging in again</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
