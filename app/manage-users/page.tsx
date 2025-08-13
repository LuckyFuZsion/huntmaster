"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { encrypt, decrypt } from "@/lib/protection"

interface User {
  username: string
  password: string
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
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

      // Load users
      const encryptedUsers = localStorage.getItem("huntmaster_users")
      if (encryptedUsers) {
        const decryptedUsers = JSON.parse(decrypt(encryptedUsers))
        setUsers(decryptedUsers)
      }
    } catch (err) {
      router.push("/")
    }
  }, [router])

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUsername || !newPassword) {
      setError("Please fill in all fields")
      return
    }

    if (users.some((user) => user.username === newUsername)) {
      setError("Username already exists")
      return
    }

    const newUser = {
      username: newUsername,
      password: encrypt(newPassword),
    }

    const updatedUsers = [...users, newUser]
    localStorage.setItem("huntmaster_users", encrypt(JSON.stringify(updatedUsers)))
    setUsers(updatedUsers)
    setNewUsername("")
    setNewPassword("")
    setError("")
  }

  const handleDeleteUser = (username: string) => {
    if (username === "admin") {
      setError("Cannot delete admin user")
      return
    }

    const updatedUsers = users.filter((user) => user.username !== username)
    localStorage.setItem("huntmaster_users", encrypt(JSON.stringify(updatedUsers)))
    setUsers(updatedUsers)
  }

  const handleBack = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Manage Users</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit">Add User</Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.username}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteUser(user.username)}
                      disabled={user.username === "admin"}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6">
            <Button variant="outline" onClick={handleBack}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

