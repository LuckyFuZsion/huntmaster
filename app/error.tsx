"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { toast } = useToast()

  useEffect(() => {
    console.error("Application error:", error)
    toast({
      title: "Error",
      description: error.message || "An unexpected error occurred",
    })
  }, [error, toast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {error.message || "An error occurred while loading the application."}
          </p>
          {error.digest && <p className="text-center text-sm text-muted-foreground">Error ID: {error.digest}</p>}
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => {
                window.location.href = "/dashboard"
              }}
            >
              Return to Dashboard
            </Button>
            <Button onClick={() => reset()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

