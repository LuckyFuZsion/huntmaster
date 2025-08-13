"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestDB() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/test-db")
      .then((res) => res.json())
      .then((data) => {
        console.log("Test data:", data)
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error:", err)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-4 text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4">
      <Card className="max-w-4xl mx-auto bg-white text-black">
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-bold mb-2">Status:</h3>
            <p className={data?.status === "Connected" ? "text-green-600" : "text-red-600"}>
              {data?.status || "Unknown"}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2">Users Found: {data?.userCount || 0}</h3>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-gray-900">ID</th>
                    <th className="text-left p-2 text-gray-900">Username</th>
                    <th className="text-left p-2 text-gray-900">Admin</th>
                    <th className="text-left p-2 text-gray-900">Password Tests</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users?.map((user: any) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-2 text-gray-900">{user.id}</td>
                      <td className="p-2 text-gray-900">{user.username}</td>
                      <td className="p-2 text-gray-900">{user.isAdmin ? "Yes" : "No"}</td>
                      <td className="p-2 text-gray-900">
                        <div>Stored Length: {user.passwordLength}</div>
                        <div className="mt-2">
                          <div className="font-semibold">Current Method:</div>
                          <div className="text-xs">Length: {user.encryptionTests.currentMethod.length}</div>
                          <div className="text-xs">
                            Matches: {user.encryptionTests.currentMethod.matches ? "Yes" : "No"}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="font-semibold">MD5:</div>
                          <div className="text-xs">Length: {user.encryptionTests.md5.length}</div>
                          <div className="text-xs">Matches: {user.encryptionTests.md5.matches ? "Yes" : "No"}</div>
                        </div>
                        <div className="mt-2">
                          <div className="font-semibold">SHA1:</div>
                          <div className="text-xs">Length: {user.encryptionTests.sha1.length}</div>
                          <div className="text-xs">Matches: {user.encryptionTests.sha1.matches ? "Yes" : "No"}</div>
                        </div>
                        <div className="mt-2">
                          <div className="font-semibold">SHA256:</div>
                          <div className="text-xs">Length: {user.encryptionTests.sha256.length}</div>
                          <div className="text-xs">Matches: {user.encryptionTests.sha256.matches ? "Yes" : "No"}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-bold mb-2 text-gray-900">Debug Notes:</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-900">
              <li>Looking for matching lengths and "Matches: Yes" to identify the correct encryption method</li>
              <li>The encryption method that matches both length and content is the one we need to use</li>
              <li>If none match, we might need to check other encryption methods or parameters</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

