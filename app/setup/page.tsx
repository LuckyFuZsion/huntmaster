"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react"

interface SetupStep {
  name: string
  status: "pending" | "loading" | "success" | "error"
  message?: string
}

export default function DatabaseSetup() {
  const [steps, setSteps] = useState<SetupStep[]>([
    { name: "Test Connection", status: "pending" },
    { name: "Create Tables", status: "pending" },
    { name: "Create Admin User", status: "pending" },
    { name: "Verify Setup", status: "pending" },
  ])
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [setupComplete, setSetupComplete] = useState(false)

  const updateStep = (index: number, update: Partial<SetupStep>) => {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...update } : step)))
  }

  const runSetup = async () => {
    setError(null)

    // Step 1: Test Connection
    updateStep(0, { status: "loading", message: "Testing database connection..." })
    try {
      const connectionRes = await fetch("/api/setup/test-connection")
      const connectionData = await connectionRes.json()

      if (!connectionData.success) {
        throw new Error(connectionData.error || "Failed to connect to database")
      }
      updateStep(0, { status: "success", message: "Database connection successful" })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      updateStep(0, { status: "error", message: errorMessage })
      setError("Database connection failed. Please check your environment variables.")
      return
    }

    // Step 2: Create Tables
    updateStep(1, { status: "loading", message: "Creating database tables..." })
    try {
      const tablesRes = await fetch("/api/setup/create-tables", { method: "POST" })
      const tablesData = await tablesRes.json()

      if (!tablesData.success) {
        throw new Error(tablesData.error || "Failed to create tables")
      }
      updateStep(1, { status: "success", message: "Database tables created successfully" })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      updateStep(1, { status: "error", message: errorMessage })
      setError("Failed to create database tables")
      return
    }

    // Step 3: Create Admin User
    updateStep(2, { status: "loading", message: "Creating admin user..." })
    try {
      const adminRes = await fetch("/api/setup/create-admin", { method: "POST" })
      const adminData = await adminRes.json()

      if (!adminData.success) {
        throw new Error(adminData.error || "Failed to create admin user")
      }
      updateStep(2, { status: "success", message: "Admin user created successfully" })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      updateStep(2, { status: "error", message: errorMessage })
      setError("Failed to create admin user")
      return
    }

    // Step 4: Verify Setup
    updateStep(3, { status: "loading", message: "Verifying setup..." })
    try {
      const verifyRes = await fetch("/api/setup/verify-database")
      const verifyData = await verifyRes.json()

      if (!verifyData.success) {
        throw new Error(verifyData.error || "Setup verification failed")
      }
      updateStep(3, { status: "success", message: "Setup verified successfully" })
      setSetupComplete(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      updateStep(3, { status: "error", message: errorMessage })
      setError("Setup verification failed")
      return
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <Card className="w-full max-w-lg border-0 bg-black/40 backdrop-blur-xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent opacity-50 blur-3xl -z-10" />

        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-br from-purple-200 to-purple-400 bg-clip-text text-transparent text-center">
            Database Setup
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {error ? (
            <Alert className="bg-red-500/20 border-red-500/50">
              <XCircle className="w-4 h-4 text-red-500" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : setupComplete ? (
            <Alert className="bg-green-500/20 border-green-500/50">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>Database setup completed successfully.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.name} className="flex items-center space-x-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.status === "success"
                          ? "bg-green-500"
                          : step.status === "error"
                            ? "bg-red-500"
                            : step.status === "loading"
                              ? "bg-blue-500 animate-pulse"
                              : "bg-gray-500"
                      }`}
                    >
                      {step.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : step.status === "error" ? (
                        <XCircle className="w-4 h-4 text-white" />
                      ) : (
                        <span className="text-white text-sm">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-purple-100">{step.name}</div>
                      {step.message && <div className="text-sm text-purple-200/60">{step.message}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={runSetup}
                disabled={steps.some((step) => step.status === "loading")}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-purple-50 shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/40"
              >
                {steps.some((step) => step.status === "loading") ? (
                  "Setting up..."
                ) : (
                  <>
                    Start Setup
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
