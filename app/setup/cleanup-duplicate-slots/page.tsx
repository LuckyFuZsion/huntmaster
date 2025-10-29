"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CleanupDuplicateSlots() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCleanup = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const session = localStorage.getItem("huntmaster_session")
      if (!session) {
        setError("No session found. Please log in first.")
        return
      }

      const response = await fetch("/api/slots/cleanup-duplicates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session }),
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || "Cleanup failed")
      }
    } catch (err) {
      setError("An error occurred during cleanup")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Cleanup Duplicate Slots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This will find and remove duplicate slots from your database. Duplicates are identified by having the same name (case-insensitive).
          </p>

          <Button onClick={handleCleanup} disabled={loading} className="w-full">
            {loading ? "Cleaning up..." : "Cleanup Duplicate Slots"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="bg-green-500/20 border-green-500/50">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-green-600">{result.message}</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Kept: {result.keptSlots} unique slots</li>
                    <li>Deleted: {result.deletedSlots} duplicate slots</li>
                    <li>Total before: {result.totalSlotsBefore} slots</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold mb-2">What this does:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Finds all slots with duplicate names (case-insensitive)</li>
              <li>Keeps the most recent slot for each name</li>
              <li>Deletes all older duplicates</li>
              <li>Only affects your current user account</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

