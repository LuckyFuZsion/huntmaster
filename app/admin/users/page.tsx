"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { decrypt, encrypt } from "@/lib/protection"
import { XCircle, Edit, Trash2 } from "lucide-react"

interface User {
  id: number
  username: string
  password: string
  is_admin: boolean
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editedUsername, setEditedUsername] = useState("")
  const [editedPassword, setEditedPassword] = useState("")
  const [editedIsAdmin, setEditedIsAdmin] = useState(false)
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
      if (sessionData.username !== "admin") {
        router.push("/dashboard")
        return
      }

      fetchUsers()
    } catch (err) {
      console.error("Error checking admin status:", err)
      router.push("/")
    }
  }, [router])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()

      if (data.success) {
        setUsers(data.users)
      } else {
        setError(data.error || "Failed to fetch users")
      }
    } catch (err) {
      setError("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setEditedUsername(user.username)
    setEditedPassword("")
    setEditedIsAdmin(user.is_admin)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    setEditingUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: editedUsername,
          password: editedPassword ? encrypt(editedPassword) : undefined,
          is_admin: editedIsAdmin,
        }),
      })

      const data = await response.json()

      if (data.success) {
        fetchUsers()
        setIsEditDialogOpen(false)
      } else {
        setError(data.error || "Failed to update user")
      }
    } catch (err) {
      setError("Failed to update user")
    }
  }

  const handleDeleteUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        fetchUsers()
        setIsDeleteDialogOpen(false)
      } else {
        setError(data.error || "Failed to delete user")
      }
    } catch (err) {
      setError("Failed to delete user")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Manage Users</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/test-new-admin")}>
              Test New Admin
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-500/20 border-red-500/50">
              <XCircle className="w-4 h-4 text-red-500" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.is_admin ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(user)}
                        disabled={user.username === "admin"}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label>Username</label>
              <Input
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="space-y-2">
              <label>New Password (leave blank to keep current)</label>
              <Input
                type="password"
                value={editedPassword}
                onChange={(e) => setEditedPassword(e.target.value)}
                placeholder="New Password"
                onPaste={(e) => e.stopPropagation()} // Allow pasting
                className="copy-enabled" // Allow copy/paste
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editedIsAdmin}
                onChange={(e) => setEditedIsAdmin(e.target.checked)}
                id="is-admin"
                className="rounded border-gray-300"
              />
              <label htmlFor="is-admin">Admin User</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete {editingUser?.username}?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

