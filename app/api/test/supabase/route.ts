import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // First, test basic connection
    const client = createClient(supabaseUrl, supabaseKey);
    
    // Check what tables exist by trying to query information_schema
    const tablesToCheck = ['users', 'slots', 'userSettings', 'userWins', 'currentGame'];
    const tableStatus: Record<string, { exists: boolean; error?: string }> = {};
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await client.from(table).select('*').limit(1);
        if (error) {
          // Check if it's a "does not exist" error
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            tableStatus[table] = { exists: false };
          } else {
            tableStatus[table] = { exists: false, error: error.message };
          }
        } else {
          tableStatus[table] = { exists: true };
        }
      } catch (e: any) {
        tableStatus[table] = { exists: false, error: e.message };
      }
    }
    
    // Try to get users count if table exists
    let userCount = 0;
    try {
      const users = await supabaseAdmin.users.findAll();
      userCount = users.length;
    } catch (e) {
      // Table doesn't exist or error
    }
    
    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      url: supabaseUrl,
      tableStatus,
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Failed to connect to Supabase",
      details: error?.message || String(error),
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

