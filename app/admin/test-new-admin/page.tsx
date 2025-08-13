"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { decrypt } from "@/lib/protection"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"

export default function TestNewAdmin() {
  const [testResults, setTestResults] = useState<{
    envVarsExist: boolean
    loginTest: boolean
    message: string
  }>({
    envVarsExist: false,
    loginTest: false,
    message: "",
  })
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
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
      runTests()
    } catch (err) {
      console.error("Error checking admin status:", err)
      router.push("/login")
    }
  }, [router])

  const runTests = async () => {
    setLoading(true)
    try {
      // Test 1: Check if environment variables exist
      const username = process.env.NEXT_PUBLIC_ADMIN_USERNAME
      const password = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

      console.log("Checking environment variables...")
      console.log("Username exists:", Boolean(username))
      console.log("Password exists:", Boolean(password))

      const envVarsExist = Boolean(username?.trim() && password?.trim())

      // Test 2: Attempt login with new credentials
      let loginSuccess = false
      let message = ""

      if (envVarsExist) {
        const formData = new FormData()
        formData.append("username", username || "")
        formData.append("password", password || "")

        const response = await fetch("/api/auth/login", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()
        loginSuccess = data.success
        message = data.success ? "Login successful with new credentials" : "Login failed with new credentials"
      } else {
        message = "Environment variables not found"
      }

      setTestResults({
        envVarsExist,
        loginTest: loginSuccess,
        message,
      })
    } catch (error) {
      console.error("Error details:", error)
      setTestResults({
        envVarsExist: false,
        loginTest: false,
        message: `Error running tests: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    }
    setLoading(false)
  }

  if (!isAdmin || loading) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">New Admin Credentials Test</CardTitle>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-500/20 border-blue-500/50">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle>Testing New Admin Credentials</AlertTitle>
            <AlertDescription>
              This page tests if your new admin credentials are properly set and working.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Alert
              className={
                testResults.envVarsExist ? "bg-green-500/20 border-green-500/50" : "bg-red-500/20 border-red-500/50"
              }
            >
              {testResults.envVarsExist ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertTitle>Environment Variables Check</AlertTitle>
              <AlertDescription>
                {testResults.envVarsExist ? (
                  <span className="text-green-500">Environment variables found</span>
                ) : (
                  <span className="text-red-500">Environment variables not found</span>
                )}
              </AlertDescription>
            </Alert>

            <Alert
              className={
                testResults.loginTest ? "bg-green-500/20 border-green-500/50" : "bg-red-500/20 border-red-500/50"
              }
            >
              {testResults.loginTest ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertTitle>Login Test</AlertTitle>
              <AlertDescription>{testResults.message}</AlertDescription>
            </Alert>

            <Button onClick={runTests} className="w-full">
              Run Tests Again
            </Button>

            <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-yellow-200">Important Notes:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Make sure your application has been redeployed after adding the variables</li>
                <li>Clear your browser cache and local storage if you experience issues</li>
                <li>Both username and password must be set for admin login to work</li>
                <li>These tests use the NEXT_PUBLIC environment variables</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

