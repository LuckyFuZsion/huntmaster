import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface CurrentGame {
  id: string
  userId: string
  gameTitle: string
  provider?: string
  updatedAt: string
}

/**
 * Hook to subscribe to real-time current game updates by username
 */
export function useSupabaseCurrentGame(username: string | null) {
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const userIdRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const loadCurrentGameRef = useRef<() => Promise<void>>()

  const loadCurrentGame = useCallback(async () => {
    if (!username) {
      setCurrentGame(null)
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
      const response = await fetch(`/api/current-game/get?username=${encodeURIComponent(username)}`)
      const data = await response.json()
      if (data.success && data.data) {
        setCurrentGame(data.data)
        if (data.data.userId) {
          userIdRef.current = data.data.userId
        }
        setError(null)
      } else {
        setCurrentGame(null)
        userIdRef.current = null
      }
    } catch (err) {
      console.error('Error loading current game:', err)
      setError(err instanceof Error ? err : new Error('Failed to load current game'))
      userIdRef.current = null
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [username])

  // Keep ref updated with latest loadCurrentGame
  useEffect(() => {
    loadCurrentGameRef.current = loadCurrentGame
  }, [loadCurrentGame])

  useEffect(() => {
    if (!username) {
      setCurrentGame(null)
      setLoading(false)
      return
    }

    let channel: any = null

    // Load initial game first to get userId
    if (loadCurrentGameRef.current) {
      loadCurrentGameRef.current()
    }

    // Subscribe to real-time changes
    // We'll filter in the callback since we need userId which comes from the initial load
    channel = supabase
      .channel(`currentGame:username:${username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'currentGame',
        },
        (payload) => {
          const changedGame = payload.new || payload.old
          if (!changedGame) return
          
          console.log('Current game real-time event received:', {
            eventType: payload.eventType,
            gameTitle: payload.new?.gameTitle || payload.old?.gameTitle,
            userId: changedGame.userId,
            ourUserId: userIdRef.current,
            username
          })
          
          // If userIdRef is not set yet, reload to get the latest data
          // This handles the case where events arrive before initial load completes
          if (!userIdRef.current) {
            console.log('Received real-time event but userId not loaded yet, reloading to get latest data:', payload.eventType)
            if (loadCurrentGameRef.current) {
              loadCurrentGameRef.current()
            }
            return
          }
          
          // Filter by userId to only process events for this user
          if (changedGame.userId === userIdRef.current) {
            console.log('Current game change detected for', username, ':', payload.eventType, {
              gameTitle: payload.new?.gameTitle || payload.old?.gameTitle,
              userId: changedGame.userId,
              matchingUserId: userIdRef.current
            })
            
            // Handle INSERT (upsert creates new) or UPDATE (upsert updates existing)
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              if (payload.new) {
                console.log('Updating current game from real-time event:', payload.new.gameTitle)
                setCurrentGame(payload.new as CurrentGame)
                // Update userIdRef in case it changed
                if (payload.new.userId) {
                  userIdRef.current = payload.new.userId
                }
              } else {
                // Fallback: reload if payload doesn't have new data
                console.log('Real-time event missing new data, reloading...')
                if (loadCurrentGameRef.current) {
                  loadCurrentGameRef.current()
                }
              }
            } else if (payload.eventType === 'DELETE') {
              console.log('Current game deleted via real-time event')
              setCurrentGame(null)
            }
          } else {
            // Log when events are filtered out (for debugging)
            console.log('Current game event filtered out (wrong user):', {
              eventType: payload.eventType,
              eventUserId: changedGame.userId,
              ourUserId: userIdRef.current,
              username
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to current game updates for', username, 'userId:', userIdRef.current)
        } else {
          console.log('Current game subscription status:', status, 'for', username)
        }
      })

    return () => {
      if (channel) {
        console.log('Cleaning up current game subscription for', username)
        supabase.removeChannel(channel)
      }
    }
  }, [username]) // Removed loadCurrentGame from deps to prevent re-subscriptions

  return { currentGame, loading, error, refetch: loadCurrentGame }
}

