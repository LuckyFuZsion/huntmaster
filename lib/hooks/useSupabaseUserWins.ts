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
            } else {
              // Fallback: try to get userId from the best wins API response if it includes user info
              // Or fetch from user settings
              try {
                const settingsResponse = await fetch(`/api/user-settings?username=${encodeURIComponent(username)}`)
                const settingsData = await settingsResponse.json()
                if (settingsData.success && settingsData.data?.userId) {
                  userIdRef.current = settingsData.data.userId
                  console.log('Got userId for', username, 'from settings API:', userIdRef.current)
                }
              } catch (e2) {
                console.warn('Could not fetch userId from settings API:', e2)
              }
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
    console.log('useSupabaseUserWinsByGame: Effect triggered', {
      username,
      gameTitle,
      lastCacheKey: lastCacheKeyRef.current
    });
    
    if (!username || !gameTitle) {
      console.log('useSupabaseUserWinsByGame: Skipping - missing username or gameTitle');
      setBestWins(null)
      setLoading(false)
      lastCacheKeyRef.current = ''
      return
    }

    let channel: any = null
    const cacheKey = `${username}:${gameTitle}`

    // Load initial data only if username/gameTitle changed
    if (lastCacheKeyRef.current !== cacheKey) {
      console.log('useSupabaseUserWinsByGame: Cache key changed, loading best wins', {
        old: lastCacheKeyRef.current,
        new: cacheKey
      });
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
    // Subscribe to ALL user wins for this user, then filter in the handler
    // This ensures we catch events even if userId isn't loaded yet
    channel = supabase
      .channel(`userWins:${username}:${gameTitle}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'userWins',
          // Don't filter at the database level - we'll filter in the handler
        },
        (payload) => {
          console.log('useSupabaseUserWinsByGame: Raw event received', {
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          });
          const changedWin = payload.new || payload.old
          if (!changedWin) return
          
          console.log('User wins real-time event received:', {
            eventType: payload.eventType,
            gameTitle: changedWin.gameTitle,
            userId: changedWin.userId,
            winAmount: payload.new?.winAmount || payload.old?.winAmount,
            ourUserId: userIdRef.current,
            ourGameTitle: gameTitle,
            ourUsername: username
          })
          
          // Normalize titles for comparison - remove extra spaces, special chars, etc.
          const normalizeTitle = (title: string | null | undefined): string => {
            if (!title) return ''
            return title.toLowerCase().trim().replace(/\s+/g, ' ')
          }
          
          const payloadGameTitle = normalizeTitle(changedWin?.gameTitle)
          const currentGameTitle = normalizeTitle(gameTitle)
          
          // More flexible matching: exact match OR contains match OR starts with match
          const titleMatches = payloadGameTitle && currentGameTitle && (
            payloadGameTitle === currentGameTitle ||
            payloadGameTitle.startsWith(currentGameTitle) ||
            currentGameTitle.startsWith(payloadGameTitle)
          )
          
          // If we have userId, also filter by it. Otherwise just filter by game title
          // If userIdRef is not set yet, still process events if title matches (will get userId on next load)
          const userIdMatches = userIdRef.current ? changedWin.userId === userIdRef.current : true
          
          // Reload logic:
          // 1. If userId matches AND title matches -> reload (best case, most accurate)
          // 2. If userId matches but title doesn't -> still reload (title might have slight variations, and best wins are per-game anyway)
          // 3. If no userId yet but title matches -> reload (will get userId on reload)
          // This ensures we catch all relevant wins even with title variations
          const shouldReload = userIdRef.current 
            ? userIdMatches // If we have userId, reload on any event for this user (title matching is handled on reload)
            : titleMatches; // If no userId yet, reload if title matches (even partially)
          
          if (shouldReload) {
            console.log('User wins change detected for', gameTitle, ':', payload.eventType, 'Updating immediately', {
              winAmount: payload.new?.winAmount,
              xWin: payload.new?.xWin,
              currentBestWin: bestWinsRef.current?.bestWinAmount,
              currentBestX: bestWinsRef.current?.bestXWin,
              hasUserId: !!userIdRef.current,
              titleMatches,
              userIdMatches
            })
            // Update immediately for instant feedback
            handleWinChange()
            
            // If we don't have userId yet and title matches, try to get it from the payload
            if (!userIdRef.current && changedWin.userId) {
              userIdRef.current = changedWin.userId
              console.log('Stored userId from event payload for future filtering:', userIdRef.current)
            }
          } else {
            console.log('User wins event filtered out:', {
              titleMatches,
              userIdMatches,
              payloadGameTitle,
              currentGameTitle,
              payloadUserId: changedWin.userId,
              ourUserId: userIdRef.current,
              username,
              reason: !titleMatches ? 'title mismatch' : !userIdMatches ? 'userId mismatch' : 'unknown'
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('User wins subscription status:', status, 'for', username, gameTitle)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to user wins updates for', username, gameTitle)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('User wins subscription error:', status, 'Will retry on next effect run')
          // The subscription will be cleaned up and recreated on the next effect run
          // We could also manually trigger a reload here as a fallback
          if (!loadingRef.current) {
            // If we're not loading, try reloading anyway as a fallback
            console.log('Reloading best wins due to subscription error')
            setTimeout(() => {
              if (!loadingRef.current) {
                loadBestWinsRef.current()
              }
            }, 2000) // Wait 2 seconds before retry
          }
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

