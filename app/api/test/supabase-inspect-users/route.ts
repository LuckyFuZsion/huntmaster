import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const client = createClient(supabaseUrl, supabaseKey);
    
    // Try to query the users table structure via a test query
    // We can't directly query information_schema easily, so we'll try to select and see what columns exist
    const { data, error } = await client
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      // Table doesn't exist or connection issue
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: "Users table does not exist",
          suggestion: "Create the users table first"
        });
      }
      
      return NextResponse.json({
        success: false,
        error: "Error accessing users table",
        details: error.message,
        code: error.code,
      }, { status: 500 });
    }
    
    // Get sample data to see columns
    const sampleUser = data && data.length > 0 ? data[0] : null;
    const existingColumns = sampleUser ? Object.keys(sampleUser) : [];
    
    // Required columns for HuntMaster
    const requiredColumns = {
      'id': 'UUID or TEXT',
      'username': 'TEXT',
      'password': 'TEXT (optional)',
      'isAdmin': 'BOOLEAN',
      'discordId': 'TEXT (optional)',
      'email': 'TEXT (optional)',
      'isActive': 'BOOLEAN (optional)',
      'createdAt': 'TIMESTAMPTZ'
    };
    
    const missingColumns: string[] = [];
    const existingColumnSet = new Set(existingColumns.map(c => c.toLowerCase()));
    
    for (const col of Object.keys(requiredColumns)) {
      // Check for both camelCase and snake_case variants
      const camelCase = col;
      const snakeCase = col.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (!existingColumnSet.has(camelCase.toLowerCase()) && !existingColumnSet.has(snakeCase)) {
        missingColumns.push(col);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Users table exists",
      existingColumns,
      sampleUser,
      missingColumns,
      requiredColumns,
      recommendation: missingColumns.length === 0 
        ? "Users table has all required columns - ready to use!"
        : `Add missing columns: ${missingColumns.join(', ')}`
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Failed to inspect users table",
      details: error?.message || String(error),
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";










