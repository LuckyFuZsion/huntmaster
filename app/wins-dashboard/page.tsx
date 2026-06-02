"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { decrypt } from "@/lib/protection"
import {
  Trophy,
  TrendingUp,
  Calendar,
  DollarSign,
  Zap,
  RefreshCw,
  Search,
  BarChart3,
  Clock,
  Gamepad2,
  AlertTriangle,
  Trash2,
} from "lucide-react"

interface UserWin {
  id: string
  userId: string
  gameTitle: string
  gameSlug?: string
  provider?: string
  bet: number
  winAmount: number
  xWin: number
  createdAt: string
}

interface WinsResponse {
  success: boolean
  data: UserWin[]
  meta: {
    days: number
    totalWins: number
    totalWinAmount: number
    biggestWin: UserWin | null
  }
  error?: string
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function WinsDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [currentUser, setCurrentUser] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [days, setDays] = useState("7")
  const [minXWin, setMinXWin] = useState("100")
  const [minWinAmount, setMinWinAmount] = useState("")
  const [winsData, setWinsData] = useState<WinsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)

  const loadWins = useCallback(async () => {
    if (!username.trim()) {
      setError("Username is required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        username: username.trim(),
        days: days || "7",
      })

      if (minXWin && minXWin.trim()) {
        params.append("minXWin", minXWin.trim())
      }

      if (minWinAmount && minWinAmount.trim()) {
        params.append("minWinAmount", minWinAmount.trim())
      }

      const response = await fetch(`/api/user-wins/recent?${params.toString()}`)
      const data: WinsResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load wins")
      }

      setWinsData(data)
    } catch (err: any) {
      console.error("Error loading wins:", err)
      setError(err?.message || "Failed to load wins data")
      setWinsData(null)
    } finally {
      setLoading(false)
    }
  }, [username, days, minXWin, minWinAmount])

  // Initialize session and username on mount
  useEffect(() => {
    const session = localStorage.getItem("huntmaster_session")
    if (!session) {
      router.push("/login")
      return
    }

    try {
      const sessionData = JSON.parse(decrypt(session))
      if (!sessionData?.username) {
        router.push("/login")
        return
      }

      const userUsername = sessionData.username
      const userIsAdmin = sessionData.isAdmin || sessionData.huntmasterAdmin || false
      
      setCurrentUser(userUsername)
      setCurrentUserId(sessionData.userId || null)
      setCurrentUsername(userUsername)
      setIsAdmin(userIsAdmin)

      // Check URL parameter for username
      const urlUsername = searchParams.get("username")
      
      if (urlUsername) {
        // If user is admin, allow them to view any username
        // If user is not admin, ignore URL param and use their own username
        if (userIsAdmin) {
          setUsername(urlUsername)
        } else {
          // Non-admin trying to view another user - use their own username
          setUsername(userUsername)
        }
      } else {
        // No URL param - default to their own username
        setUsername(userUsername)
      }

      setInitialized(true)
    } catch (err) {
      console.error("Error loading session:", err)
      router.push("/login")
    }
  }, [router, searchParams])

  // Auto-load wins when username is set and initialized
  useEffect(() => {
    if (initialized && username) {
      loadWins()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, username]) // Only run when initialized and username changes

  const handleDeleteWin = async (winId: string, winUserId: string) => {
    // Check authorization
    if (!isAdmin && currentUserId !== winUserId) {
      setError("You can only delete your own wins")
      return
    }

    if (!confirm("Are you sure you want to delete this win? This action cannot be undone.")) {
      return
    }

    setDeletingIds(prev => new Set(prev).add(winId))
    setError(null)

    try {
      const session = localStorage.getItem("huntmaster_session")
      if (!session) {
        setError("Not authenticated")
        return
      }

      const response = await fetch(`/api/user-wins/${winId}?session=${encodeURIComponent(session)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete win")
      }

      // Reload wins after deletion
      await loadWins()
    } catch (err: any) {
      console.error("Error deleting win:", err)
      setError(err?.message || "Failed to delete win")
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(winId)
        return next
      })
    }
  }

  // Check if user can delete a specific win
  const canDeleteWin = (winUserId: string) => {
    return isAdmin || currentUserId === winUserId
  }

  // Check if viewing own wins (for showing delete buttons)
  const isViewingOwnWins = currentUsername && username.toLowerCase().trim() === currentUsername.toLowerCase().trim()

  // Calculate statistics for charts
  const stats = useMemo(() => {
    if (!winsData?.data) return null

    const wins = winsData.data
    const totalWins = wins.length
    const totalWinAmount = wins.reduce((sum, win) => sum + win.winAmount, 0)
    const totalBet = wins.reduce((sum, win) => sum + win.bet, 0)
    const avgXWin = totalWins > 0 ? wins.reduce((sum, win) => sum + win.xWin, 0) / totalWins : 0
    const maxXWin = Math.max(...wins.map((w) => w.xWin), 0)
    const maxWinAmount = Math.max(...wins.map((w) => w.winAmount), 0)

    // Group by game
    const gamesMap = new Map<string, { count: number; totalWin: number }>()
    wins.forEach((win) => {
      const existing = gamesMap.get(win.gameTitle) || { count: 0, totalWin: 0 }
      gamesMap.set(win.gameTitle, {
        count: existing.count + 1,
        totalWin: existing.totalWin + win.winAmount,
      })
    })

    const topGames = Array.from(gamesMap.entries())
      .map(([game, stats]) => ({ game, ...stats }))
      .sort((a, b) => b.totalWin - a.totalWin)
      .slice(0, 5)

    // Group by day for timeline
    const dailyWins = new Map<string, { count: number; totalWin: number }>()
    wins.forEach((win) => {
      const date = new Date(win.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const existing = dailyWins.get(date) || { count: 0, totalWin: 0 }
      dailyWins.set(date, {
        count: existing.count + 1,
        totalWin: existing.totalWin + win.winAmount,
      })
    })

    return {
      totalWins,
      totalWinAmount,
      totalBet,
      avgXWin,
      maxXWin,
      maxWinAmount,
      topGames,
      dailyWins: Array.from(dailyWins.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }
  }, [winsData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-8 h-8" />
              Wins Dashboard
            </h1>
            <p className="text-gray-300 mt-1">View and analyze user win statistics</p>
          </div>
          <Button variant="secondary" onClick={loadWins} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-gray-950/60 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Filters
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure search parameters to view specific wins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Username</label>
                <Input
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => {
                    const newUsername = e.target.value
                    // If user is not admin, prevent changing username to someone else
                    if (!isAdmin && newUsername !== currentUser) {
                      setError("You can only view your own wins")
                      return
                    }
                    setUsername(newUsername)
                    setError(null)
                  }}
                  disabled={!isAdmin}
                  className="bg-gray-900/80 border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {!isAdmin && (
                  <p className="text-xs text-gray-400 mt-1">You can only view your own wins</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Days (1-365)</label>
                <Input
                  type="number"
                  placeholder="7"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  min="1"
                  max="365"
                  className="bg-gray-900/80 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Min X Win</label>
                <Input
                  type="number"
                  placeholder="100"
                  value={minXWin}
                  onChange={(e) => setMinXWin(e.target.value)}
                  min="0"
                  step="0.01"
                  className="bg-gray-900/80 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Min Win Amount ($)</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={minWinAmount}
                  onChange={(e) => setMinWinAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="bg-gray-900/80 border-gray-700 text-white"
                />
              </div>
            </div>
            <Button onClick={loadWins} className="mt-4" disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search Wins
            </Button>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert className="bg-red-500/20 border-red-500/50 text-red-100">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 text-white text-lg">Loading wins data...</div>
        )}

        {/* Stats Cards */}
        {winsData && stats && !loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Total Wins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{stats.totalWins}</p>
                  <p className="text-sm text-gray-400">Over {winsData.meta.days} days</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-950 to-blue-900 border-blue-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Total Win Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalWinAmount)}</p>
                  <p className="text-sm text-gray-400">
                    Avg: {formatCurrency(stats.totalWins > 0 ? stats.totalWinAmount / stats.totalWins : 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-950 to-purple-900 border-purple-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Max X Win
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{stats.maxXWin.toFixed(2)}x</p>
                  <p className="text-sm text-gray-400">Best multiplier</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-950 to-amber-900 border-amber-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Biggest Win
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{formatCurrency(stats.maxWinAmount)}</p>
                  <p className="text-sm text-gray-400">Single win record</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Games Chart */}
            {stats.topGames.length > 0 && (
              <Card className="bg-gray-950/60 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5" />
                    Top Games by Win Amount
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Games with the highest total win amounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topGames.map((game, idx) => {
                      const percentage = (game.totalWin / stats.totalWinAmount) * 100
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">{game.game}</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(game.totalWin)} ({game.count} wins)
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Timeline Chart */}
            {stats.dailyWins.length > 0 && (
              <Card className="bg-gray-950/60 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Daily Win Timeline
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Win distribution over the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.dailyWins.map((day, idx) => {
                      const maxDailyWin = Math.max(...stats.dailyWins.map((d) => d.totalWin))
                      const percentage = (day.totalWin / maxDailyWin) * 100
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">{day.date}</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(day.totalWin)} ({day.count} wins)
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Wins Table */}
            <Card className="bg-gray-950/60 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  All Wins ({winsData.data.length})
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Complete list of wins matching your filters
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {winsData.data.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    No wins found matching the selected criteria
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">Date & Time</TableHead>
                        <TableHead className="text-gray-300">Game</TableHead>
                        <TableHead className="text-gray-300">Provider</TableHead>
                        <TableHead className="text-gray-300">Bet</TableHead>
                        <TableHead className="text-gray-300">Win Amount</TableHead>
                        <TableHead className="text-gray-300">X Win</TableHead>
                        {(isAdmin || isViewingOwnWins) && (
                          <TableHead className="text-gray-300">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {winsData.data.map((win) => (
                        <TableRow key={win.id} className="hover:bg-gray-800/50">
                          <TableCell className="text-white">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {formatDate(win.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-medium">{win.gameTitle}</TableCell>
                          <TableCell className="text-gray-400">{win.provider || "—"}</TableCell>
                          <TableCell className="text-gray-300">{formatCurrency(win.bet)}</TableCell>
                          <TableCell className="text-emerald-400 font-semibold">
                            {formatCurrency(win.winAmount)}
                          </TableCell>
                          <TableCell className="text-blue-400 font-semibold">{win.xWin.toFixed(2)}x</TableCell>
                          {(isAdmin || isViewingOwnWins) && (
                            <TableCell>
                              {canDeleteWin(win.userId) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteWin(win.id, win.userId)}
                                  disabled={deletingIds.has(win.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                                  title={isAdmin ? "Delete win (admin)" : "Delete your win"}
                                >
                                  {deletingIds.has(win.id) ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

