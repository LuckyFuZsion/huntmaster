import { NextResponse } from "next/server"
import { getSupabaseClient as getSupabaseAdminClient } from "@/lib/supabase-admin"

// Test endpoint to verify query performance and index usage
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const testType = searchParams.get("type") || "wins"

    const client = getSupabaseAdminClient()
    const results: any = {}

    if (testType === "wins" || testType === "all") {
      // Test userWins query with date range and xWin filter
      const startTime = Date.now()
      
      // Get a test user
      const { data: users } = await client.from("users").select("id").limit(1)
      if (users && users.length > 0) {
        const userId = users[0].id
        
        const { data, error } = await client
          .from("userWins")
          .select("*")
          .eq("userId", userId)
          .gte("createdAt", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .gte("xWin", 100)
          .order("winAmount", { ascending: false })
          .limit(500)
        
        const queryTime = Date.now() - startTime
        
        results.winsQuery = {
          success: !error,
          error: error?.message,
          executionTime: `${queryTime}ms`,
          resultCount: data?.length || 0,
          userId,
        }
      }
    }

    if (testType === "slots" || testType === "all") {
      // Test slots query with userId and createdAt ordering
      const startTime = Date.now()
      
      const { data: users } = await client.from("users").select("id").limit(1)
      if (users && users.length > 0) {
        const userId = users[0].id
        
        const { data, error } = await client
          .from("slots")
          .select("*")
          .eq("userId", userId)
          .order("createdAt", { ascending: true })
        
        const queryTime = Date.now() - startTime
        
        results.slotsQuery = {
          success: !error,
          error: error?.message,
          executionTime: `${queryTime}ms`,
          resultCount: data?.length || 0,
          userId,
        }
      }
    }

    if (testType === "indexes" || testType === "all") {
      // Check if indexes exist
      const { data: winIndexes, error: winError } = await client.rpc("pg_indexes", {
        table_name: "userWins",
      }).catch(() => ({ data: null, error: null }))
      
      // Direct query to check indexes
      const indexQuery = `
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename IN ('userWins', 'slots')
        ORDER BY tablename, indexname;
      `
      
      // Use raw query if available, otherwise just report
      results.indexes = {
        note: "Check Supabase SQL Editor for index verification",
        expectedIndexes: [
          "idx_userWins_userId_createdAt",
          "idx_userWins_userId_xWin",
          "idx_userWins_createdAt",
          "idx_userWins_userId_winAmount",
          "idx_slots_userId_createdAt",
        ],
      }
    }

    return NextResponse.json({
      success: true,
      message: "Query performance test completed",
      results,
      recommendations: {
        winsQuery: results.winsQuery?.executionTime
          ? `Wins query took ${results.winsQuery.executionTime}. Should be < 100ms with indexes.`
          : "Could not test wins query",
        slotsQuery: results.slotsQuery?.executionTime
          ? `Slots query took ${results.slotsQuery.executionTime}. Should be < 50ms with indexes.`
          : "Could not test slots query",
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Test failed",
      },
      { status: 500 },
    )
  }
}

