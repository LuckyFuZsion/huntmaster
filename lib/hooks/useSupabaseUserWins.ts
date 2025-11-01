import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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

interface BestWins {
  bestWinAmount: number | null
  bestXWin: number | null
}

/**
 * Hook to get user's best wins for a specific game, with real-time updates
 */
export function useSupabaseUserWinsByGame(username: string | null, gameTitle: string | null) {
  const [bestWins, setBestWins] = useState<BestWins | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const userIdRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  const loadBestWins = useCallback(async () => {
    if (!username || !gameTitle) {
      setBestWins(null)
      setLoading(false)
      userIdRef.current = null
      return
    }

    if (loadingRef.current) {
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      const response = await fetch(`/api/user-wins/best?username=${encodeURIComponent(username)}&title=${encodeURIComponent(gameTitle)}`)
      const data = await response.json()
      if (data.success && data.data) {
        setBestWins(data.data)
        // Get userId from username to filter real-time events
        // We can get it from slots or settings API (both return user data)
        if (!userIdRef.current) {
          try {
            // Try getting userId from slots API (lightweight)
            const userResponse = await fetch(`/api/slots/by-username?username=${encodeURIComponent(username)}`)
            const userData = await userResponse.json()
            if (userData.success && Array.isArray(userData.slots) && userData.slots.length > 0) {
              userIdRef.current = userData.slots[0].userId
              console.log('Got userId for', username, 'from slots API:', userIdRef.current)
            }
          } catch (e) {
            console.warn('Could not fetch userId for filtering:', e)
          }
        }
        setError(null)
      } else {
        setBestWins(null)
      }
    } catch (err) {
      console.error('Error loading best wins:', err)
      setError(err instanceof Error ? err : new Error('Failed to load best wins'))
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [username, gameTitle])

  // Debounce reloads to prevent rapid-fire API calls
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastCacheKeyRef = useRef<string>('') // Track what we last loaded to prevent duplicate reloads
  const loadBestWinsRef = useRef(loadBestWins)
  const bestWinsRef = useRef(bestWins) // Keep ref to current bestWins for logging
  
  // Keep refs updated
  useEffect(() => {
    loadBestWinsRef.current = loadBestWins
    bestWinsRef.current = bestWins
  }, [loadBestWins, bestWins])

  useEffect(() => {
    if (!username || !gameTitle) {
      setBestWins(null)
      setLoading(false)
      lastCacheKeyRef.current = ''
      return
    }

    let channel: any = null
    const cacheKey = `${username}:${gameTitle}`

    // Load initial data only if username/gameTitle changed
    if (lastCacheKeyRef.current !== cacheKey) {
      loadBestWinsRef.current()
      lastCacheKeyRef.current = cacheKey
    }

    // Optimized update function - reloads immediately for instant updates
    const handleWinChange = () => {
      // Clear any pending debounced reload
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      // Reload immediately for instant updates
      loadBestWinsRef.current()
    }

    // Subscribe to real-time changes for userWins
    // Filter to only process changes for the specific game title
    channel = supabase
      .channel(`userWins:${username}:${gameTitle}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'userWins',
        },
        (payload) => {
          const changedWin = payload.new || payload.old
          if (!changedWin) return
          
          console.log('User wins real-time event received:', {
            eventType: payload.eventType,
            gameTitle: changedWin.gameTitle,
            userId: changedWin.userId,
            winAmount: payload.new?.winAmount || payload.old?.winAmount,
            ourUserId: userIdRef.current,
            ourGameTitle: gameTitle
          })
          
          // Filter by game title (case-insensitive) and userId if available
          const payloadGameTitle = changedWin?.gameTitle?.toLowerCase().trim()
          const currentGameTitle = gameTitle?.toLowerCase().trim()
          const titleMatches = payloadGameTitle && currentGameTitle && payloadGameTitle === currentGameTitle
          
          // If we have userId, also filter by it. Otherwise just filter by game title
          // If userIdRef is not set yet, still process events if title matches (will get userId on next load)
          const userIdMatches = userIdRef.current ? changedWin.userId === userIdRef.current : true
          
          // Also handle case where userId isn't loaded yet - if title matches and we don't have userId, 
          // process it anyway and reload to get fresh data (which will include userId)
          if (titleMatches && userIdMatches) {
            console.log('User wins change detected for', gameTitle, ':', payload.eventType, 'Updating immediately', {
              winAmount: payload.new?.winAmount,
              xWin: payload.new?.xWin,
              currentBestWin: bestWinsRef.current?.bestWinAmount,
              currentBestX: bestWinsRef.current?.bestXWin
            })
            // Update immediately for instant feedback
            handleWinChange()
          } else {
            console.log('User wins event filtered out:', {
              titleMatches,
              userIdMatches,
              payloadGameTitle,
              currentGameTitle,
              payloadUserId: changedWin.userId,
              ourUserId: userIdRef.current,
              username
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to user wins updates for', username, gameTitle)
        }
      })

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [username, gameTitle]) // Only depend on username/gameTitle, not loadBestWins

  return { bestWins, loading, error, refetch: loadBestWins }
}

