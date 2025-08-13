"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { decrypt } from "@/lib/protection"
import { AlertCircle } from "lucide-react"

export default function TestEnv() {
  const [envInfo, setEnvInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
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

      // Get environment variable information
      fetch("/api/test-env")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error)
          } else {
            setEnvInfo(data)
          }
        })
        .catch((err) => {
          setError("Failed to fetch environment data")
          console.error("Error fetching env info:", err)
        })
    } catch (err) {
      console.error("Error checking admin status:", err)
      router.push("/login")
    }
  }, [router])

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Environment Variables Test</CardTitle>
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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Length</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envInfo?.variables.map((v: any) => (
                    <TableRow key={v.name}>
                      <TableCell>{v.name}</TableCell>
                      <TableCell>{v.isSet ? "Set" : "Not Set"}</TableCell>
                      <TableCell>{v.length || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Debug Information:</h3>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(envInfo?.debug, null, 2)}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

