import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key (if available) or anon key
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables for admin client:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables.')
  }

  return { supabaseUrl, supabaseKey }
}

let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseAdminClient() {
  if (!supabaseClient) {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseConfig()
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      })
    } catch (error) {
      console.error('Failed to initialize Supabase admin client:', error)
      throw error
    }
  }
  return supabaseClient
}

// Helper function to normalize user data (handle both camelCase and snake_case)
function normalizeUser(user: any): User {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    isAdmin: user.isAdmin ?? user.is_admin ?? false,
    discordId: user.discordId ?? user.discord_id,
    email: user.email,
    isActive: user.isActive ?? user.is_active ?? true,
    huntmaster: user.huntmaster ?? false, // Default to false for safety
    huntmasterAdmin: user.huntmasterAdmin ?? user.huntmaster_admin ?? false,
    createdAt: user.createdAt ?? user.created_at ?? new Date(),
  }
}

// Type definitions (matching Firestore interfaces for compatibility)
export interface User {
  id: string
  username: string
  password?: string
  isAdmin: boolean
  discordId?: string
  email?: string
  isActive?: boolean
  huntmaster?: boolean // Access flag for HuntMaster application
  huntmasterAdmin?: boolean // Admin flag for HuntMaster (separate from main app admin)
  createdAt: Date | string
}

export interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
  userId: string
  createdAt: Date | string
}

export interface UserSettings {
  id: string
  userId: string
  startBalance: string
  endBalance: string
  colourTheme: string
  selectedFont: string
  fontSize: number
  cornerRadius: string
  spiderColors?: {
    headerStart: string
    headerEnd: string
    footerStart: string
    footerEnd: string
    tableEven: string
    tableOdd: string
    fontColor: string
    borderColor: string
  }
  spiderTextColors?: {
    headerText: string
    statsLabels: string
    statsValues: string
    tableHeaders: string
    tableContent: string
    biggestWinLabel: string
    biggestWinValue: string
    biggestMultiLabel: string
    biggestMultiValue: string
    progressText: string
  }
  spiderFontFamily?: string
  spiderBorderWidth?: number
  spiderHeaderText?: string
  spiderSize?: string
  spiderRadius?: string
  updatedAt: Date | string
}

export interface UserWin {
  id: string
  userId: string
  gameTitle: string
  gameSlug?: string
  provider?: string
  bet: number
  winAmount: number
  xWin: number
  createdAt: Date | string
}

export interface CurrentGame {
  id: string
  userId: string
  gameTitle: string
  provider?: string
  updatedAt: Date | string
}

// Supabase database operations (mirroring firestoreAdmin interface)
export const supabaseAdmin = {
  // User operations
  users: {
    async findAll(): Promise<User[]> {
      // Try camelCase first, then snake_case
      let { data, error } = await getSupabaseAdminClient()
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false })
      
      // If camelCase fails, try snake_case
      if (error && (error.code === '42703' || error.message?.includes('column'))) {
        const result = await getSupabaseAdminClient()
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })
        data = result.data
        error = result.error
      }
      
      if (error) throw error
      return (data || []).map((user: any) => normalizeUser(user))
    },
    
    async findOne(id: string): Promise<User | null> {
      const { data, error } = await getSupabaseAdminClient()
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return data ? normalizeUser(data) : null
    },
    
    async findByUsername(username: string): Promise<User | null> {
      const { data, error } = await getSupabaseAdminClient()
        .from('users')
        .select('*')
        .eq('username', username)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return data ? normalizeUser(data) : null
    },
    
    async findByDiscordId(discordId: string): Promise<User | null> {
      // Try camelCase first, then snake_case
      let { data, error } = await getSupabaseAdminClient()
        .from('users')
        .select('*')
        .eq('discordId', discordId)
        .single()
      
      // If camelCase fails, try snake_case
      if (error && (error.code === '42703' || error.message?.includes('column'))) {
        const result = await getSupabaseAdminClient()
          .from('users')
          .select('*')
          .eq('discord_id', discordId)
          .single()
        data = result.data
        error = result.error
      }
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return data ? normalizeUser(data) : null
    },
    
    async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
      // Convert to snake_case for database if needed
      const insertData: any = {
        username: userData.username,
        password: userData.password,
        email: userData.email,
        discordId: userData.discordId,
        createdAt: new Date().toISOString(),
      }
      
      // Try camelCase first
      try {
        insertData.isAdmin = userData.isAdmin
        insertData.isActive = userData.isActive ?? true
        insertData.huntmaster = userData.huntmaster ?? false
        insertData.huntmasterAdmin = userData.huntmasterAdmin ?? false
        
        const { data, error } = await getSupabaseAdminClient()
          .from('users')
          .insert(insertData)
          .select()
          .single()
        
        if (!error) {
          return normalizeUser(data)
        }
        
        // If camelCase fails, try snake_case
        if (error.code === '42703' || error.message?.includes('column')) {
          const snakeCaseData: any = {
            username: userData.username,
            password: userData.password,
            email: userData.email,
            discord_id: userData.discordId,
            is_admin: userData.isAdmin,
            is_active: userData.isActive ?? true,
            huntmaster: userData.huntmaster ?? false,
            huntmaster_admin: userData.huntmasterAdmin ?? false,
            created_at: new Date().toISOString(),
          }
          
          const { data: snakeData, error: snakeError } = await getSupabaseAdminClient()
            .from('users')
            .insert(snakeCaseData)
            .select()
            .single()
          
          if (snakeError) throw snakeError
          return normalizeUser(snakeData)
        }
        
        throw error
      } catch (error: any) {
        throw error
      }
    },
    
    async update(id: string, updateData: Partial<Omit<User, 'id'>>): Promise<void> {
      // Try camelCase first
      const { error } = await getSupabaseAdminClient()
        .from('users')
        .update(updateData)
        .eq('id', id)
      
      // If camelCase fails, try converting to snake_case
      if (error && (error.code === '42703' || error.message?.includes('column'))) {
        const snakeCaseData: any = {}
        if (updateData.isAdmin !== undefined) snakeCaseData.is_admin = updateData.isAdmin
        if (updateData.isActive !== undefined) snakeCaseData.is_active = updateData.isActive
        if (updateData.huntmaster !== undefined) snakeCaseData.huntmaster = updateData.huntmaster
        if (updateData.huntmasterAdmin !== undefined) snakeCaseData.huntmaster_admin = updateData.huntmasterAdmin
        if (updateData.discordId !== undefined) snakeCaseData.discord_id = updateData.discordId
        if (updateData.email !== undefined) snakeCaseData.email = updateData.email
        if (updateData.password !== undefined) snakeCaseData.password = updateData.password
        if (updateData.username !== undefined) snakeCaseData.username = updateData.username
        
        const { error: snakeError } = await getSupabaseAdminClient()
          .from('users')
          .update(snakeCaseData)
          .eq('id', id)
        
        if (snakeError) throw snakeError
      } else if (error) {
        throw error
      }
    },
    
    async delete(id: string): Promise<void> {
      const { error } = await getSupabaseAdminClient()
        .from('users')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
  },

  // Slot operations
  slots: {
    async findAll(): Promise<Slot[]> {
      const { data, error } = await getSupabaseAdminClient()
        .from('slots')
        .select('*')
        .order('createdAt', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    
    async findByUserId(userId: string): Promise<Slot[]> {
      const { data, error } = await getSupabaseAdminClient()
        .from('slots')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    
    async findOne(id: string): Promise<Slot | null> {
      const { data, error } = await getSupabaseAdminClient()
        .from('slots')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return data
    },
    
    async create(slotData: Omit<Slot, 'id' | 'createdAt'>): Promise<Slot> {
      const { data, error } = await getSupabaseAdminClient()
        .from('slots')
        .insert({
          ...slotData,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    async update(id: string, data: Partial<Omit<Slot, 'id'>>): Promise<void> {
      // Convert camelCase to snake_case for database columns
      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.bet !== undefined) updateData.bet = data.bet
      if (data.win !== undefined) updateData.win = data.win
      if (data.userId !== undefined) updateData["userId"] = data.userId
      if (data.createdAt !== undefined) updateData["createdAt"] = data.createdAt
      
      const { error } = await getSupabaseAdminClient()
        .from('slots')
        .update(updateData)
        .eq('id', id)
      
      if (error) {
        console.error('Error updating slot:', error, 'Update data:', updateData)
        throw error
      }
    },
    
    async delete(id: string): Promise<void> {
      const { error } = await getSupabaseAdminClient()
        .from('slots')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    
    async deleteAllByUserId(userId: string): Promise<void> {
      const { error } = await getSupabaseAdminClient()
        .from('slots')
        .delete()
        .eq('userId', userId)
      
      if (error) throw error
    },
  },

  // User Settings operations
  userSettings: {
    async findByUserId(userId: string): Promise<UserSettings | null> {
      const { data, error } = await getSupabaseAdminClient()
        .from('userSettings')
        .select('*')
        .eq('userId', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`No settings found for userId: ${userId}`)
          return null // Not found
        }
        console.error('Error fetching user settings:', error)
        throw error
      }
      
      if (data) {
        console.log(`Settings found for userId ${userId}:`, data)
      }
      
      return data
    },
    
    async update(userId: string, settings: Partial<Omit<UserSettings, 'id' | 'userId'>>): Promise<void> {
      // Check if settings exist first
      const existing = await this.findByUserId(userId)
      
      const updateData = {
        ...settings,
        updatedAt: new Date().toISOString(),
      }
      
      if (existing) {
        // Update existing settings
        const { error: updateError } = await getSupabaseAdminClient()
          .from('userSettings')
          .update(updateData)
          .eq('userId', userId)
        
        if (updateError) {
          console.error('Error updating user settings:', updateError)
          throw updateError
        }
      } else {
        // Create new settings if they don't exist
        const { error: insertError } = await getSupabaseAdminClient()
          .from('userSettings')
          .insert({
            userId,
            ...updateData,
          })
          
        if (insertError) {
          console.error('Error inserting user settings:', insertError)
          throw insertError
        }
      }
    },
  },

  // User Wins operations
  userWins: {
    async create(win: Omit<UserWin, 'id' | 'createdAt'>): Promise<UserWin> {
      const { data, error } = await getSupabaseAdminClient()
        .from('userWins')
        .insert({
          ...win,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    async findBestByUserAndGame(userId: string, gameTitleOrSlug: string): Promise<{ bestWinAmount: number | null; bestXWin: number | null }> {
      const { data, error } = await getSupabaseAdminClient()
        .from('userWins')
        .select('winAmount, xWin')
        .eq('userId', userId)
        .or(`gameTitle.eq.${gameTitleOrSlug},gameSlug.eq.${gameTitleOrSlug}`)
        .order('winAmount', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        return { bestWinAmount: null, bestXWin: null }
      }
      
      // Also find best X win
      const { data: xWinData, error: xWinError } = await getSupabaseAdminClient()
        .from('userWins')
        .select('xWin')
        .eq('userId', userId)
        .or(`gameTitle.eq.${gameTitleOrSlug},gameSlug.eq.${gameTitleOrSlug}`)
        .order('xWin', { ascending: false })
        .limit(1)
      
      if (xWinError) throw xWinError
      
      return {
        bestWinAmount: data[0].winAmount || null,
        bestXWin: (xWinData && xWinData[0]?.xWin) || null,
      }
    },
    
    async findOverallBestByUser(userId: string): Promise<{ bestWinAmount: number | null; bestXWin: number | null; bestWinGame?: string; bestXWinGame?: string }> {
      // Get all wins for user, ordered by winAmount descending
      const { data: winAmountData, error: winAmountError } = await getSupabaseAdminClient()
        .from('userWins')
        .select('winAmount, gameTitle')
        .eq('userId', userId)
        .order('winAmount', { ascending: false })
        .limit(1)
      
      if (winAmountError) throw winAmountError
      
      // Get all wins for user, ordered by xWin descending
      const { data: xWinData, error: xWinError } = await getSupabaseAdminClient()
        .from('userWins')
        .select('xWin, gameTitle')
        .eq('userId', userId)
        .order('xWin', { ascending: false })
        .limit(1)
      
      if (xWinError) throw xWinError
      
      return {
        bestWinAmount: winAmountData && winAmountData[0] ? (winAmountData[0].winAmount || null) : null,
        bestXWin: xWinData && xWinData[0] ? (xWinData[0].xWin || null) : null,
        bestWinGame: winAmountData && winAmountData[0] ? winAmountData[0].gameTitle : undefined,
        bestXWinGame: xWinData && xWinData[0] ? xWinData[0].gameTitle : undefined,
      }
    },
  },

  // Current Game operations
  currentGame: {
    async findByUserId(userId: string): Promise<CurrentGame | null> {
      const { data, error } = await getSupabaseAdminClient()
        .from('currentGame')
        .select('*')
        .eq('userId', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return data
    },
    
    async upsert(gameData: Omit<CurrentGame, 'id' | 'updatedAt'>): Promise<CurrentGame> {
      const { data, error } = await getSupabaseAdminClient()
        .from('currentGame')
        .upsert({
          ...gameData,
          updatedAt: new Date().toISOString(),
        }, {
          onConflict: 'userId',
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    async delete(userId: string): Promise<void> {
      const { error } = await getSupabaseAdminClient()
        .from('currentGame')
        .delete()
        .eq('userId', userId)
      
      if (error) throw error
    },
    
    async set(userId: string, gameTitle: string, provider?: string): Promise<CurrentGame> {
      const { data, error } = await getSupabaseAdminClient()
        .from('currentGame')
        .upsert({
          userId,
          gameTitle,
          provider: provider || null,
          updatedAt: new Date().toISOString(),
        }, {
          onConflict: 'userId',
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    async clear(userId: string): Promise<void> {
      await this.delete(userId)
    },
  },
}

