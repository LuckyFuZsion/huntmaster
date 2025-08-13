"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function MigrateDiscordPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const runMigration = async () => {
    try {
      setStatus("loading")
      setMessage("Running Discord migration...")

      const response = await fetch("/api/setup/migrate-discord")
      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(data.message)
      } else {
        setStatus("error")
        setMessage(data.error || "Migration failed")
      }
    } catch (error) {
      setStatus("error")
      setMessage(error.message || "An unexpected error occurred")
    }
  }

  return (
    <div className="container mx-auto py-10 bg-gray-900 min-h-screen">
      <Card className="max-w-md mx-auto bg-gray-800 text-white border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Discord Integration Migration</CardTitle>
          <CardDescription className="text-gray-300">
            Run this migration to add Discord support to your database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "success" && (
            <Alert className="mb-4 bg-green-900 border-green-700 text-white">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertTitle className="text-green-400">Success</AlertTitle>
              <AlertDescription className="text-white">{message}</AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert className="mb-4 bg-red-900 border-red-700 text-white">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Error</AlertTitle>
              <AlertDescription className="text-white">{message}</AlertDescription>
            </Alert>
          )}

          <p className="text-gray-300 mb-4">
            This will add the necessary database columns to support Discord login. It's safe to run this migration
            multiple times.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            onClick={runMigration}
            disabled={status === "loading"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Migration...
              </>
            ) : (
              "Run Migration"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

