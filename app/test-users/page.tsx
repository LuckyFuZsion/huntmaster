"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { decrypt } from "@/lib/protection"
import { AlertCircle } from "lucide-react"

interface UserInfo {
  username: string | undefined
  hasPassword: boolean
  isAdmin?: boolean
}

export default function TestUsers() {
  const [users, setUsers] = useState<UserInfo[]>([])
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
      fetch("/api/test-users")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error)
          } else {
            setUsers(data.users)
          }
        })
        .catch((err) => {
          setError("Failed to fetch user data")
          console.error("Error fetching users:", err)
        })
    } catch (err) {
      console.error("Error checking admin status:", err)
      router.push("/login")
    }
  }, [router])

  if (!isAdmin) {
    return null
  }

  const getUserType = (index: number) => {
    if (index === 0) return "Admin"
    return `User${index}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Environment Variable Users Test</CardTitle>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Has Password</TableHead>
                  <TableHead>Is Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell>{getUserType(index)}</TableCell>
                    <TableCell>{user.username || "Not set"}</TableCell>
                    <TableCell>{user.hasPassword ? "Yes" : "No"}</TableCell>
                    <TableCell>{user.isAdmin ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Notes:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Username showing "Not set" means the environment variable is missing</li>
              <li>"Has Password: No" means the password environment variable is empty or missing</li>
              <li>Both username and password must be set for a user to be able to log in</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
