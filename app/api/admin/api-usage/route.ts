import { NextResponse } from "next/server"
import { supabaseAdmin, User, UserApiUsageRecord } from "@/lib/supabase-admin"
import { decrypt } from "@/lib/protection"

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
  planExpiresAt?: string | null
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

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getMonthKey(month?: string): string {
  if (month) return month
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getSessionToken(request: Request): string | null {
  const headerToken = request.headers.get("x-huntmaster-session")
  if (headerToken) {
    return headerToken
  }

  const url = new URL(request.url)
  return url.searchParams.get("session")
}

function requireAdminSession(request: Request) {
  const token = getSessionToken(request)
  if (!token) {
    throw new HttpError(401, "Session required")
  }

  try {
    const sessionData = JSON.parse(decrypt(token))
    if (!sessionData?.isAdmin) {
      throw new HttpError(403, "Admin privileges required")
    }
    return sessionData
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    throw new HttpError(401, "Invalid session token")
  }
}

function buildStatus(limit: number | null, remaining: number | null, percentageUsed: number, user: User): UsageStatus {
  if (user.isActive === false) {
    return "inactive"
  }
  if (limit === null) {
    return "unlimited"
  }
  if ((remaining ?? 0) <= 0) {
    return "exhausted"
  }
  if (percentageUsed >= 90) {
    return "warning"
  }
  return "healthy"
}

function mapUsageToUser(
  user: User,
  usageRecord: UserApiUsageRecord | undefined,
  defaultLimit: number | null
): DashboardUserRow {
  const limit = defaultLimit
  const monthlySearches = usageRecord?.monthlySearches ?? 0
  const remaining = limit !== null ? Math.max(0, limit - monthlySearches) : null
  const percentageUsed = limit ? Math.min(100, Math.round((monthlySearches / limit) * 100)) : 0
  const status = buildStatus(limit, remaining, percentageUsed, user)

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    huntmasterAdmin: user.huntmasterAdmin,
    isActive: user.isActive,
    monthlyLimit: limit,
    monthlySearches,
    remaining,
    percentageUsed,
    status,
    updatedAt: usageRecord?.updatedAt ?? null,
    lastResetAt: usageRecord?.lastResetAt ?? null,
    planExpiresAt: user.planExpiresAt ? (typeof user.planExpiresAt === 'string' ? user.planExpiresAt : user.planExpiresAt.toISOString()) : null,
  }
}

export async function GET(request: Request) {
  try {
    requireAdminSession(request)
    const url = new URL(request.url)
    const monthParam = url.searchParams.get("month") || undefined
    const targetMonth = getMonthKey(monthParam)
    
    // Pagination support - default to 100 users per page
    const pageParam = url.searchParams.get("page")
    const limitParam = url.searchParams.get("limit")
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1
    const limit = limitParam ? Math.min(500, Math.max(10, parseInt(limitParam, 10))) : 100
    const offset = (page - 1) * limit

    const [allUsers, usage] = await Promise.all([
      supabaseAdmin.users.findAll(),
      supabaseAdmin.apiUsage.listCurrentUsage(targetMonth),
    ])

    const usageMap = new Map<string, UserApiUsageRecord>()
    usage.forEach((row) => {
      usageMap.set(row.userId, row)
    })

    const dashboardUsers = allUsers.map((user) =>
      mapUsageToUser(user, usageMap.get(user.id), user.apiMonthlyLimit ?? null),
    )

    dashboardUsers.sort((a, b) => b.monthlySearches - a.monthlySearches)

    // Calculate totals from ALL users (not just paginated)
    const totals = {
      totalUsers: dashboardUsers.length,
      cappedUsers: dashboardUsers.filter((u) => u.monthlyLimit !== null).length,
      unlimitedUsers: dashboardUsers.filter((u) => u.monthlyLimit === null).length,
      overLimitUsers: dashboardUsers.filter((u) => u.status === "exhausted").length,
      totalSearches: dashboardUsers.reduce((sum, u) => sum + u.monthlySearches, 0),
    }

    // Paginate results
    const paginatedUsers = dashboardUsers.slice(offset, offset + limit)
    const totalPages = Math.ceil(dashboardUsers.length / limit)

    const payload: DashboardPayload & { pagination?: { page: number; limit: number; totalPages: number; total: number } } = {
      month: targetMonth,
      totals,
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        totalPages,
        total: dashboardUsers.length,
      },
    }

    return NextResponse.json({ success: true, data: payload })
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error("Error fetching admin API usage:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load API usage" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdminSession(request)
    const body = await request.json()
    const { action, userId } = body ?? {}

    if (!userId || typeof userId !== "string") {
      throw new HttpError(400, "userId is required")
    }

    switch (action) {
      case "set-limit": {
        if (!("limit" in body)) {
          throw new HttpError(400, "limit is required for set-limit")
        }
        const limitValue =
          body.limit === null || body.limit === "" ? null : Number(body.limit)

        if (limitValue !== null && (Number.isNaN(limitValue) || limitValue < 0)) {
          throw new HttpError(400, "limit must be a positive number or null")
        }

        await supabaseAdmin.apiUsage.setLimit(userId, limitValue)
        return NextResponse.json({
          success: true,
          message: limitValue === null ? "User is now unlimited" : "Monthly limit updated",
        })
      }
      case "reset-usage": {
        const month = body.month || undefined
        await supabaseAdmin.apiUsage.resetUserUsage(userId, month)
        return NextResponse.json({
          success: true,
          message: "Monthly usage reset",
        })
      }
      case "set-plan-expires": {
        if (!("planExpiresAt" in body)) {
          throw new HttpError(400, "planExpiresAt is required for set-plan-expires")
        }
        const expiresValue = body.planExpiresAt === null || body.planExpiresAt === "" 
          ? null 
          : new Date(body.planExpiresAt).toISOString()

        await supabaseAdmin.users.update(userId, { planExpiresAt: expiresValue })
        return NextResponse.json({
          success: true,
          message: expiresValue === null ? "Plan expiration cleared" : "Plan expiration updated",
        })
      }
      default:
        throw new HttpError(400, "Unsupported action")
    }
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error("Error updating API usage:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update usage settings" },
      { status: 500 },
    )
  }
}




