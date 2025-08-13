"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { decrypt } from "@/lib/protection"
import { XCircle, AlertCircle } from "lucide-react"

interface EnvUser {
  username: string
  userId: number
  isAdmin: boolean
}

export default function AdminManage() {
  const [users, setUsers] = useState<EnvUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if admin
    const session = localStorage.getItem("huntmaster_session")
    if (!session) {
      router.push("/")
      return
    }

    try {
      const sessionData = JSON.parse(decrypt(session))
      if (!sessionData.isAdmin) {
        router.push("/dashboard")
        return
      }

      // Fetch environment variable users
      fetch("/api/test-users")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error)
          } else {
            setUsers(
              data.users.map((user: any) => ({
                username: user.username || "Not set",
                userId: user.userId || 0,
                isAdmin: user.isAdmin || false,
              })),
            )
          }
          setLoading(false)
        })
        .catch((err) => {
          console.error("Error fetching users:", err)
          setError("Failed to fetch users")
          setLoading(false)
        })
    } catch (err) {
      console.error("Error checking admin status:", err)
      router.push("/")
    }
  }, [router])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Environment Variable Users</CardTitle>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-500/20 border-red-500/50">
              <XCircle className="w-4 h-4 text-red-500" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert className="mb-4 bg-blue-500/20 border-blue-500/50">
            <AlertCircle className="w-4 h-4 text-blue-500" />
            <AlertTitle>Environment Variable Mode</AlertTitle>
            <AlertDescription>
              Users are currently managed through environment variables. To modify users, you need to update your
              environment variables.
            </AlertDescription>
          </Alert>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={index}>
                  <TableCell>{index === 0 ? "Admin" : `User${index}`}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    {user.username === "Not set" ? (
                      <span className="text-red-500">Not Configured</span>
                    ) : (
                      <span className="text-green-500">Configured</span>
                    )}
                  </TableCell>
                  <TableCell>{user.isAdmin ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Environment Variables Required:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>ADMIN_USERNAME and ADMIN_PASSWORD - For admin user</li>
                <li>
                  USER1_USERNAME and USER1_PASSWORD through USER10_USERNAME and USER10_PASSWORD - For regular users
                </li>
                <li>Total of 11 users supported (1 admin + 10 regular users)</li>
              </ul>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-yellow-200">Important Notes:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>System now supports up to 11 users (1 admin + 10 regular users)</li>
                <li>Users can only be modified by updating environment variables</li>
                <li>Both username and password must be set for a user to be able to log in</li>
                <li>Changes to environment variables require an application restart</li>
                <li>Contact your administrator to modify user credentials</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
