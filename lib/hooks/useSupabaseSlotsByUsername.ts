import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
  userId: string
  createdAt: string
}

/**
 * Hook to subscribe to real-time slot updates by username
 * Used by OBS browser sources and widgets
 * 
 * Note: Subscribes to all slot changes and filters client-side since we need
 * to first fetch slots to get the userId
 */
export function useSupabaseSlotsByUsername(username: string | null) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const userIdRef = useRef<string | null>(null)
  const loadingRef = useRef(false) // Prevent duplicate loads
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const loadSlots = useCallback(async () => {
    if (!username) {
      setSlots([])
      setLoading(false)
      userIdRef.current = null
      return
    }

    // Prevent duplicate simultaneous loads
    if (loadingRef.current) {
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      const response = await fetch(`/api/slots/by-username?username=${encodeURIComponent(username)}`)
      const data = await response.json()
      if (data.success && Array.isArray(data.slots)) {
        // Deduplicate slots by ID and name
        const seenIds = new Set<string>()
        const seenNames = new Map<string, Slot>()
        const uniqueSlots = data.slots.filter((slot: Slot) => {
          // First check by ID
          if (seenIds.has(slot.id)) {
            console.log('Duplicate slot ID found:', slot.id, slot.name)
            return false
          }
          seenIds.add(slot.id)
          
          // Also check by name (case-insensitive) to catch duplicates with different IDs
          const nameKey = slot.name.toLowerCase().trim()
          if (seenNames.has(nameKey)) {
            console.log('Duplicate slot name found:', slot.name)
            return false
          }
          seenNames.set(nameKey, slot)
          
          return true
        })
        
        if (uniqueSlots.length !== data.slots.length) {
          console.log(`Deduplicated: ${data.slots.length} slots -> ${uniqueSlots.length} unique slots`)
        }
        
        setSlots(uniqueSlots)
        // Extract userId from first slot if available
        if (uniqueSlots.length > 0 && uniqueSlots[0].userId) {
          userIdRef.current = uniqueSlots[0].userId
        }
        setError(null)
      } else {
        setSlots([])
        userIdRef.current = null
      }
    } catch (err) {
      console.error('Error loading slots:', err)
      setError(err instanceof Error ? err : new Error('Failed to load slots'))
      userIdRef.current = null
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [username])

  useEffect(() => {
    if (!username) {
      setSlots([])
      setLoading(false)
      return
    }

    let channel: any = null

    // Load initial data
    loadSlots()

    // Debounced reload function to prevent rapid-fire requests
    const debouncedReload = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        loadSlots()
      }, 500) // Wait 500ms after last change before reloading
    }

    // Subscribe to real-time changes for slots table
    // We'll filter by userId in the callback since we get userId from the slots
    channel = supabase
      .channel(`slots:username:${username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slots',
        },
        (payload) => {
          // Only process if it matches our user's slots
          const changedSlot = payload.new || payload.old
          if (changedSlot && changedSlot.userId === userIdRef.current) {
            console.log('Slot change detected for', username, ':', payload.eventType, {
              slotId: changedSlot.id,
              slotName: changedSlot.name,
              win: payload.new?.win ?? payload.old?.win,
              prevWin: payload.old?.win,
              newWin: payload.new?.win
            })
            
            // Update state directly for immediate feedback
            if (payload.eventType === 'INSERT' && payload.new) {
              const newSlot = payload.new as Slot
              setSlots((prev) => {
                // Check for duplicates by ID and name
                const hasDuplicateId = prev.some((s) => s.id === newSlot.id)
                const hasDuplicateName = prev.some(
                  (s) => s.name.toLowerCase().trim() === newSlot.name.toLowerCase().trim()
                )
                
                if (hasDuplicateId || hasDuplicateName) {
                  console.log('Prevented duplicate slot insertion:', newSlot.name, newSlot.id)
                  return prev // Don't add duplicate
                }
                
                return [...prev, newSlot]
              })
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              // Update slot - this handles both win being added AND win being deleted (set to null)
              const updatedSlot = payload.new as Slot
              setSlots((prev) => {
                const updated = prev.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot))
                console.log('Slot updated via real-time:', updatedSlot.name, 'Win changed from', payload.old?.win, 'to', updatedSlot.win)
                return updated
              })
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setSlots((prev) => prev.filter((slot) => slot.id !== payload.old.id))
            } else {
              // For batch operations or uncertainty, reload after debounce
              debouncedReload()
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to slots updates for', username)
        }
      })

    // Cleanup subscription on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [username]) // Removed loadSlots from deps to prevent re-subscriptions

  return { slots, loading, error, refetch: loadSlots }
}

