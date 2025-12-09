import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decrypt } from "@/lib/protection";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionParam = searchParams.get("session");

    if (!sessionParam) {
      return NextResponse.json({ success: false, error: "Session required" }, { status: 401 });
    }

    const sessionData = JSON.parse(decrypt(sessionParam));
    const userId = sessionData.userId;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    // Get user's current usage
    const usage = await supabaseAdmin.apiUsage.getUsage(userId);

    // Get user info to show limit and plan expiration
    const user = await supabaseAdmin.users.findOne(userId);
    const monthlyLimit = user?.apiMonthlyLimit ?? null;
    const planExpiresAt = user?.planExpiresAt ?? null;

    // Calculate percentage used
    const percentageUsed = monthlyLimit 
      ? Math.min(100, Math.round((usage.monthlySearches / monthlyLimit) * 100))
      : 0;

    // Get current month info
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const daysRemaining = daysInMonth - currentDay;

    // Calculate projected usage
    const dailyAverage = usage.monthlySearches / currentDay;
    const projectedUsage = Math.round(dailyAverage * daysInMonth);

    return NextResponse.json({
      success: true,
      usage: {
        monthlySearches: usage.monthlySearches,
        monthlyLimit: monthlyLimit,
        remaining: usage.remaining,
        percentageUsed: percentageUsed,
        isUnlimited: monthlyLimit === null,
        currentMonth: currentMonth,
        daysRemaining: daysRemaining,
        dailyAverage: Math.round(dailyAverage),
        projectedUsage: projectedUsage,
        willExceedLimit: monthlyLimit ? projectedUsage > monthlyLimit : false,
        planExpiresAt: planExpiresAt ? (typeof planExpiresAt === 'string' ? planExpiresAt : planExpiresAt.toISOString()) : null
      }
    });
  } catch (error: any) {
    console.error("Error fetching user usage:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch usage"
    }, { status: 500 });
  }
}


