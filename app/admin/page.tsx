"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { decrypt } from "@/lib/protection"
import { 
  Users, 
  Shield, 
  ArrowLeft,
  Database,
  BarChart3
} from "lucide-react"

export default function AdminDashboard() {
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
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
      setUsername(sessionData.username)
      setLoading(false)
    } catch (err) {
      console.error("Error checking admin status:", err)
      router.push("/")
    }
  }, [router])

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-300">Welcome, {username}</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Alert className="mb-6 bg-blue-500/20 border-blue-500/50 text-blue-200">
          <Shield className="w-4 h-4 text-blue-400" />
          <AlertTitle>Admin Panel</AlertTitle>
          <AlertDescription>
            This is the admin control panel. Use the cards below to access different administrative functions.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          {/* User Management */}
          <Card className="bg-gradient-to-br from-blue-950 to-blue-900 border-blue-800 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/admin/users")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm">
                Manage users, create accounts, edit permissions, and delete users.
              </p>
            </CardContent>
          </Card>

          {/* Environment Variables Management */}
          <Card className="bg-gradient-to-br from-purple-950 to-purple-900 border-purple-800 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/admin/manage")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Environment Variables
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm">
                View and manage users stored in environment variables.
              </p>
            </CardContent>
          </Card>

          {/* API Usage Dashboard */}
          <Card className="bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/admin/api-usage")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  API Usage
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm">
                Review per-user search consumption, adjust limits, and reset monthly usage.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

