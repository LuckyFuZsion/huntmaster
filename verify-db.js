import { createPool } from "@vercel/postgres"

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
})

async function verifyDatabase() {
  const client = await pool.connect()
  try {
    console.log("🔍 Starting database verification...\n")

    // Test basic connection
    console.log("Testing connection...")
    await client.query("SELECT NOW()")
    console.log("✅ Database connection successful\n")

    // Check users table
    console.log("Checking users table...")
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `)

    if (!tableCheck.rows[0].exists) {
      throw new Error("❌ users table not found")
    }
    console.log("✅ users table exists\n")

    // Verify table structure
    console.log("Verifying table structure...")
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `)

    const requiredColumns = {
      username: "character varying",
      password: "character varying",
      is_admin: "boolean",
    }

    const missingColumns = []
    for (const [column, type] of Object.entries(requiredColumns)) {
      if (!columns.rows.some((row) => row.column_name === column && row.data_type === type)) {
        missingColumns.push(`${column} (${type})`)
      }
    }

    if (missingColumns.length > 0) {
      throw new Error(`❌ Missing or incorrect columns: ${missingColumns.join(", ")}`)
    }
    console.log("✅ Table structure is correct\n")

    // Check for admin user
    console.log("Checking for admin user...")
    const adminCheck = await client.query(`
      SELECT COUNT(*) FROM users WHERE is_admin = true;
    `)

    if (adminCheck.rows[0].count === "0") {
      console.log("⚠️ Warning: No admin user found\n")
    } else {
      console.log("✅ Admin user exists\n")
    }

    // Check for old User table
    console.log("Checking for old User table...")
    const oldTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'User'
      );
    `)

    if (oldTableCheck.rows[0].exists) {
      console.log("⚠️ Warning: Old User table still exists. Consider running migration\n")
    } else {
      console.log("✅ No old User table found\n")
    }

    console.log("✅ Database verification completed successfully!")
  } catch (error) {
    console.error("\n❌ Verification failed:", error.message)
  } finally {
    client.release()
  }
}

verifyDatabase()

