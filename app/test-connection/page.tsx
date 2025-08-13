"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle } from "lucide-react"

export default function TestConnection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [timestamp, setTimestamp] = useState("")

  const testConnection = async () => {
    try {
      setStatus("loading")
      const response = await fetch("/api/test-db")
      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(data.message)
        setTimestamp(new Date(data.timestamp).toLocaleString())
      } else {
        setStatus("error")
        setMessage(data.error)
      }
    } catch (error) {
      setStatus("error")
      setMessage("Failed to test connection")
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testConnection} disabled={status === "loading"}>
            {status === "loading" ? "Testing..." : "Test Connection"}
          </Button>

          {status === "success" && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                {message}
                <div className="text-sm mt-1">Server time: {timestamp}</div>
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Error</AlertTitle>
              <AlertDescription className="text-red-700">{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

