"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { decrypt } from "@/lib/protection"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3,
  Shield,
  RefreshCw,
  Users,
  AlertTriangle,
  Infinity,
  Zap,
  Search as SearchIcon,
  TrendingUp,
  CircleSlash,
  CheckCircle2,
} from "lucide-react"

type UsageStatus = "healthy" | "warning" | "exhausted" | "unlimited" | "inactive"

interface DashboardUserRow {
  id: string
  username: string
  email?: string
  isAdmin: boolean
  huntmasterAdmin?: boolean
  isActive?: boolean
  monthlyLimit: number | null
  monthlySearches: number
  remaining: number | null
  percentageUsed: number
  status: UsageStatus
  updatedAt?: string | null
  lastResetAt?: string | null
}

interface DashboardPayload {
  month: string
  totals: {
    totalUsers: number
    cappedUsers: number
    unlimitedUsers: number
    overLimitUsers: number
    totalSearches: number
  }
  users: DashboardUserRow[]
}

const statusStyles: Record<UsageStatus, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "text-emerald-300 bg-emerald-400/10" },
  warning: { label: "Warning", className: "text-amber-300 bg-amber-400/10" },
  exhausted: { label: "Exhausted", className: "text-red-300 bg-red-400/10" },
  unlimited: { label: "Unlimited", className: "text-blue-300 bg-blue-400/10" },
  inactive: { label: "Inactive", className: "text-slate-300 bg-slate-500/10" },
}

interface BannerState {
  type: "success" | "error"
  message: string
}

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  return value.toLocaleString()
}

export default function AdminApiUsagePage() {
  const router = useRouter()
  const [usageData, setUsageData] = useState<DashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [banner, setBanner] = useState<BannerState | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<UsageStatus | "all">("all")
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadUsage = useCallback(async (session: string) => {
    setLoading(true)
    setBanner(null)
    try {
      const response = await fetch("/api/admin/api-usage", {
        headers: {
          "X-Huntmaster-Session": session,
        },
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load usage data")
      }
      const data: DashboardPayload = payload.data
      setUsageData(data)
      const drafts: Record<string, string> = {}
      data.users.forEach((user) => {
        drafts[user.id] = user.monthlyLimit?.toString() ?? ""
      })
      setLimitDrafts(drafts)
    } catch (error: any) {
      console.error("Failed to load admin usage dashboard:", error)
      setBanner({ type: "error", message: error?.message || "Unable to load usage data" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const session = localStorage.getItem("huntmaster_session")
    if (!session) {
      router.push("/login")
      return
    }

    try {
      const sessionData = JSON.parse(decrypt(session))
      if (!sessionData?.isAdmin) {
        router.push("/dashboard")
        return
      }
      setSessionToken(session)
      loadUsage(session)
    } catch (error) {
      console.error("Failed to verify admin session:", error)
      router.push("/login")
    }
  }, [loadUsage, router])

  const filteredUsers = useMemo(() => {
    if (!usageData) return []
    const needle = searchTerm.trim().toLowerCase()
    return usageData.users.filter((user) => {
      const matchesSearch =
        !needle ||
        user.username.toLowerCase().includes(needle) ||
        (user.email && user.email.toLowerCase().includes(needle))

      const matchesStatus = statusFilter === "all" ? true : user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [usageData, searchTerm, statusFilter])

  const handleLimitSave = async (userId: string, limitValue: number | null) => {
    if (!sessionToken) return
    setActionLoading(`limit-${userId}`)
    try {
      const response = await fetch("/api/admin/api-usage", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Huntmaster-Session": sessionToken,
        },
        body: JSON.stringify({
          action: "set-limit",
          userId,
          limit: limitValue,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update limit")
      }
      setBanner({ type: "success", message: payload.message || "Limit updated" })
      await loadUsage(sessionToken)
    } catch (error: any) {
      console.error("Failed to set limit:", error)
      setBanner({ type: "error", message: error?.message || "Unable to update limit" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetUsage = async (userId: string) => {
    if (!sessionToken) return
    setActionLoading(`reset-${userId}`)
    try {
      const response = await fetch("/api/admin/api-usage", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Huntmaster-Session": sessionToken,
        },
        body: JSON.stringify({
          action: "reset-usage",
          userId,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to reset usage")
      }
      setBanner({ type: "success", message: payload.message || "Usage reset" })
      await loadUsage(sessionToken)
    } catch (error: any) {
      console.error("Failed to reset usage:", error)
      setBanner({ type: "error", message: error?.message || "Unable to reset usage" })
    } finally {
      setActionLoading(null)
    }
  }

  const renderStatusBadge = (status: UsageStatus) => {
    const config = statusStyles[status]
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    )
  }

  if (loading && !usageData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center text-white text-lg">
        Loading API usage dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">API Usage Dashboard</h1>
            <p className="text-gray-300">
              Monitor monthly API consumption, limits, and allowances across every account.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/admin")}>
              <Shield className="w-4 h-4 mr-2" />
              Admin Home
            </Button>
            <Button variant="secondary" onClick={() => sessionToken && loadUsage(sessionToken)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {banner && (
          <Alert
            className={`${
              banner.type === "error"
                ? "bg-red-500/20 border-red-500/50 text-red-100"
                : "bg-emerald-500/20 border-emerald-500/50 text-emerald-100"
            }`}
          >
            {banner.type === "error" ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <AlertTitle>{banner.type === "error" ? "Issue" : "Success"}</AlertTitle>
            <AlertDescription>{banner.message}</AlertDescription>
          </Alert>
        )}

        {usageData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-950 to-blue-900 border-blue-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Current Month</CardTitle>
                  <CardDescription className="text-gray-300 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {usageData.month}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(usageData.totals.totalSearches)}
                  </p>
                  <p className="text-sm text-gray-400">Total searches tracked</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Active Users</CardTitle>
                  <CardDescription className="text-gray-300 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Accounts reporting usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(usageData.totals.totalUsers)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {usageData.totals.cappedUsers} capped · {usageData.totals.unlimitedUsers} unlimited
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-950 to-amber-900 border-amber-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Approaching Limits</CardTitle>
                  <CardDescription className="text-gray-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Includes exhausted accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">
                    {usageData.users.filter((u) => u.status === "warning").length +
                      usageData.totals.overLimitUsers}
                  </p>
                  <p className="text-sm text-gray-400">
                    {usageData.users.filter((u) => u.status === "warning").length} nearing ·{" "}
                    {usageData.totals.overLimitUsers} out of quota
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-950 to-purple-900 border-purple-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Unlimited Plans</CardTitle>
                  <CardDescription className="text-gray-300 flex items-center gap-2">
                    <Infinity className="w-4 h-4" />
                    No cap configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(usageData.totals.unlimitedUsers)}
                  </p>
                  <p className="text-sm text-gray-400">Unlimited or legacy users</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-950/60 border-gray-800">
              <CardHeader className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Usage by Account
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Filter, adjust allowances, or reset usage for any user.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-1">
                      <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search by username or email"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="pl-9 bg-gray-900/80 border-gray-700 text-white"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as UsageStatus | "all")}>
                      <SelectTrigger className="bg-gray-900/80 border-gray-700 text-white">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-800">
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="healthy">Healthy</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="exhausted">Exhausted</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Limit</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-10">
                          No users match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredUsers.map((user) => {
                      const draftValue = limitDrafts[user.id] ?? ""
                      return (
                        <TableRow key={user.id} className="border-gray-800">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">{user.username}</span>
                              <span className="text-xs text-gray-400">{user.email || "No email"}</span>
                              <div className="flex gap-2 mt-1 text-xs text-gray-400">
                                {user.isAdmin && (
                                  <span className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> App Admin
                                  </span>
                                )}
                                {user.huntmasterAdmin && (
                                  <span className="flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> HuntMaster Admin
                                  </span>
                                )}
                                {user.isActive === false && (
                                  <span className="flex items-center gap-1 text-amber-300">
                                    <CircleSlash className="w-3 h-3" /> Inactive
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{renderStatusBadge(user.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center justify-between text-gray-300">
                                <span>{formatNumber(user.monthlySearches)} used</span>
                                <span>
                                  {user.monthlyLimit === null
                                    ? "∞"
                                    : `${user.percentageUsed}%`}
                                </span>
                              </div>
                              <Progress
                                value={user.monthlyLimit === null ? 0 : user.percentageUsed}
                                className="h-2"
                              />
                              {user.monthlyLimit !== null && (
                                <p className="text-xs text-gray-500">
                                  {formatNumber(user.remaining)} remaining
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-[220px]">
                            <div className="space-y-2">
                              <Input
                                type="number"
                                min={0}
                                placeholder="Unlimited"
                                value={draftValue}
                                onChange={(event) =>
                                  setLimitDrafts((prev) => ({
                                    ...prev,
                                    [user.id]: event.target.value,
                                  }))
                                }
                                className="bg-gray-900/70 border-gray-700 text-white"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={actionLoading === `limit-${user.id}`}
                                  onClick={() =>
                                    handleLimitSave(
                                      user.id,
                                      draftValue === "" ? null : Number(draftValue),
                                    )
                                  }
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actionLoading === `limit-${user.id}`}
                                  onClick={() => handleLimitSave(user.id, null)}
                                >
                                  Unlimited
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[160px]">
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-amber-300 hover:text-amber-200"
                                disabled={actionLoading === `reset-${user.id}`}
                                onClick={() => handleResetUsage(user.id)}
                              >
                                Reset Month
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}


