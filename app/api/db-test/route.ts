import { sql } from "@vercel/postgres"

export const runtime = "edge"

export async function GET() {
  try {
    // Test 1: Basic connection
    console.log("Testing database connection...")
    const connectionTest = await sql`SELECT 1 as connection_test`
    console.log("Connection test result:", connectionTest.rows[0])

    // Test 2: Check if users table exists
    console.log("Checking users table...")
    const tableTest = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `
    console.log("Table test result:", tableTest.rows[0])

    // Test 3: Count users
    console.log("Counting users...")
    const userCount = await sql`SELECT COUNT(*) FROM users`
    console.log("User count:", userCount.rows[0])

    // Return all test results
    return new Response(
      JSON.stringify({
        connection: "success",
        tableExists: tableTest.rows[0].exists,
        userCount: userCount.rows[0].count,
        connectionUrl: process.env.POSTGRES_URL ? "Set" : "Not set",
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Database test error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        connectionUrl: process.env.POSTGRES_URL ? "Set" : "Not set",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

