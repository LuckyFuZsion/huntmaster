"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { decrypt } from "@/lib/protection"
import { XCircle, Edit, Trash2, UserCheck, UserX } from "lucide-react"

interface User {
  id: string | number
  username: string
  password?: string
  is_admin: boolean
  isAdmin?: boolean // Support both formats
  discordId?: string
  email?: string
  isActive?: boolean
}

// Helper to get admin status from either field
const getIsAdmin = (user: User) => user.isAdmin !== undefined ? user.isAdmin : user.is_admin

// Helper to get user type
const getUserType = (user: User) => {
  if (user.discordId) {
    return { type: "Discord", badge: "bg-blue-500/20 text-blue-300 border-blue-500/50" }
  }
  return { type: "Password", badge: "bg-gray-500/20 text-gray-300 border-gray-500/50" }
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newIsAdmin, setNewIsAdmin] = useState(false)
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
    setEditedIsAdmin(getIsAdmin(user))
    setIsEditDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    setEditingUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleToggleActive = async (user: User) => {
    const newActiveState = !(user.isActive !== false) // Default to true if undefined
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}/toggle-active`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: newActiveState,
        }),
      })

      const data = await response.json()

      if (data.success) {
        fetchUsers()
      } else {
        setError(data.error || "Failed to update user status")
      }
    } catch (err) {
      setError("Failed to update user status")
    }
  }

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      setError("Username and password are required")
      return
    }

    try {
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          isAdmin: newIsAdmin,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNewUsername("")
        setNewPassword("")
        setNewIsAdmin(false)
        setIsAddDialogOpen(false)
        fetchUsers()
      } else {
        setError(data.error || "Failed to create user")
      }
    } catch (err) {
      setError("Failed to create user")
    }
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
          password: editedPassword || undefined,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4 md:p-8">
      <Card className="max-w-7xl mx-auto">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl sm:text-2xl">Manage Users</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">Add New User</Button>
            <Button variant="outline" onClick={() => router.push("/admin/test-new-admin")} className="w-full sm:w-auto">
              Test New Admin
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full sm:w-auto">
              Back to Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {error && (
            <Alert className="mb-4 bg-red-500/20 border-red-500/50">
              <XCircle className="w-4 h-4 text-red-500" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No users found</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {users.map((user) => {
                  const userType = getUserType(user)
                  const isActive = user.isActive !== false
                  const isUserAdmin = getIsAdmin(user)
                  return (
                    <Card key={user.id} className="border-gray-700">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-white mb-2">{user.username}</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">Type:</span>
                                <span className={`px-2 py-1 rounded text-xs border ${userType.badge}`}>
                                  {userType.type}
                                </span>
                              </div>
                              {user.email && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Email:</span>
                                  <span className="text-white break-all">{user.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">Admin:</span>
                                <span className="text-white">{isUserAdmin ? "Yes" : "No"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">Status:</span>
                                <span className={`px-2 py-1 rounded text-xs border ${
                                  isActive 
                                    ? "bg-green-500/20 text-green-300 border-green-500/50" 
                                    : "bg-red-500/20 text-red-300 border-red-500/50"
                                }`}>
                                  {isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-700">
                          {!isUserAdmin && (
                            <Button
                              variant={isActive ? "outline" : "default"}
                              onClick={() => handleToggleActive(user)}
                              className={`w-full justify-center ${
                                isActive 
                                  ? "border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20" 
                                  : "bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30"
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            className="w-full justify-center"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit User
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(user)}
                            disabled={user.username === "admin"}
                            className="w-full justify-center"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Username</TableHead>
                <TableHead className="min-w-[80px]">Type</TableHead>
                <TableHead className="min-w-[150px] hidden sm:table-cell">Email</TableHead>
                <TableHead className="min-w-[60px]">Admin</TableHead>
                <TableHead className="min-w-[80px]">Status</TableHead>
                <TableHead className="min-w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const userType = getUserType(user)
                const isActive = user.isActive !== false // Default to true if undefined
                const isUserAdmin = getIsAdmin(user)
                return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-sm sm:text-base">{user.username}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs border ${userType.badge}`}>
                      {userType.type}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{user.email || "-"}</TableCell>
                  <TableCell className="text-sm">{isUserAdmin ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs border ${
                      isActive 
                        ? "bg-green-500/20 text-green-300 border-green-500/50" 
                        : "bg-red-500/20 text-red-300 border-red-500/50"
                    }`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {!isUserAdmin && (
                        <Button
                          variant={isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                          className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                            isActive 
                              ? "border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20" 
                              : "bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <UserX className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Activate</span>
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(user)}
                        disabled={user.username === "admin"}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
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
                checked={editedIsAdmin || false}
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
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4">
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label>Username</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="space-y-2">
              <label>Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newIsAdmin || false}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
                id="new-is-admin"
                className="rounded border-gray-300"
              />
              <label htmlFor="new-is-admin">Admin User</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
