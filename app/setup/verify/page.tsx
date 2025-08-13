"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useState } from "react"
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react"

export default function DatabaseVerification() {
  const [status, setStatus] = useState<{
    message: string
    error?: boolean
    done?: boolean
  }>({ message: "Ready to verify database" })

  async function verifyDatabase() {
    setStatus({ message: "Verifying database connection..." })

    try {
      // Test connection and verify User table
      const res = await fetch("/api/setup/verify-database")
      const data = await res.json()

      if (data.success) {
        setStatus({
          message: "Database verified successfully! You can now use this application.",
          done: true,
        })
      } else {
        setStatus({
          message: data.error || "Verification failed",
          error: true,
        })
      }
    } catch (error) {
      setStatus({
        message: "Failed to verify database",
        error: true,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <Card className="w-full max-w-lg border-0 bg-black/40 backdrop-blur-xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent opacity-50 blur-3xl -z-10" />

        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-br from-purple-200 to-purple-400 bg-clip-text text-transparent text-center">
            Database Verification
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {status.done ? (
            <Alert className="bg-green-500/20 border-green-500/50">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          ) : status.error ? (
            <Alert className="bg-red-500/20 border-red-500/50">
              <XCircle className="w-4 h-4 text-red-500" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-purple-200/60 text-center">
                Click below to verify your existing Neon database connection. This will not modify any existing data.
              </p>

              <Button
                onClick={verifyDatabase}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-purple-50 shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/40"
              >
                Verify Database
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
