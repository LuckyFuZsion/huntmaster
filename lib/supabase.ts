import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials with validation
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!url,
      hasKey: !!key,
      url,
    })
    // In production, we should fail gracefully or use fallback
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
  }

  return { url, key }
}

// Create a single supabase client for interacting with your database
// Use lazy initialization to avoid errors if env vars aren't set during build
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    try {
      const { url, key } = getSupabaseConfig()
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    } catch (error) {
      // In production, log error but don't crash
      console.error('Failed to initialize Supabase client:', error)
      throw error
    }
  }
  return supabaseClient
}

// For backwards compatibility, export as supabase with lazy getter
// This ensures the client is only created when actually used
const supabaseProxy = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  }
})

export const supabase = supabaseProxy

// Server-side client (for use in API routes)
// Note: You may want to use service role key for admin operations
export function createServerClient() {
  const { url, key } = getSupabaseConfig()
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}



