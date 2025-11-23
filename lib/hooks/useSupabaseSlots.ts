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
 * Hook to subscribe to real-time slot updates for a specific user
 * Replaces polling with push-based updates using Supabase real-time
 */
export function useSupabaseSlots(userId: string | null) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const loadingRef = useRef(false) // Prevent duplicate loads
  const deleteEventCountRef = useRef(0) // Track rapid DELETE events (bulk delete)
  const deleteEventTimerRef = useRef<NodeJS.Timeout | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const loadSlotsRef = useRef<() => Promise<void>>()
  const slotsCountRef = useRef(0) // Track current slots count for bulk delete detection
  const insertReloadTimerRef = useRef<NodeJS.Timeout | null>(null) // Debounce reloads from INSERT events

  // Load initial slots
  const loadSlots = useCallback(async () => {
    if (!userId) {
      setSlots([])
      setLoading(false)
      return
    }

    // Prevent duplicate simultaneous loads
    if (loadingRef.current) {
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      const response = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: localStorage.getItem('huntmaster_session'),
          action: 'get',
        }),
      })

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
        slotsCountRef.current = uniqueSlots.length
        setError(null)
      } else {
        setSlots([])
        slotsCountRef.current = 0
      }
    } catch (err) {
      console.error('Error loading slots:', err)
      setError(err instanceof Error ? err : new Error('Failed to load slots'))
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [userId])

  // Keep ref updated with latest loadSlots function
  useEffect(() => {
    loadSlotsRef.current = loadSlots
  }, [loadSlots])

  useEffect(() => {
    if (!userId) {
      setSlots([])
      setLoading(false)
      return
    }

    // Load initial data
    loadSlots()

    // Debounced reload function to prevent rapid-fire requests
    const debouncedReload = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        if (loadSlotsRef.current) {
          loadSlotsRef.current()
        }
      }, 500)
    }

    // Subscribe to real-time changes for this user's slots
    const channel = supabase
      .channel(`slots:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'slots',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log('Slot change detected:', payload.eventType, payload)
          
          // Update state directly for immediate feedback (no API call needed)
          if (payload.eventType === 'INSERT' && payload.new) {
            const newSlot = payload.new as Slot
            
            // AGGRESSIVE WORKAROUND: If we have slots locally and receive an INSERT event,
            // it likely means slots were deleted and recreated (deleteAll + createBatch pattern).
            // Reload immediately to sync with database, don't wait for duplicate detection.
            if (slotsCountRef.current > 0 && loadSlotsRef.current) {
              console.log('🔄 Received INSERT event while we have slots locally - likely after delete+recreate, scheduling reload', {
                newSlotName: newSlot.name,
                newSlotId: newSlot.id,
                currentSlotsCount: slotsCountRef.current,
                userId
              })
              // Clear any existing reload timer
              if (insertReloadTimerRef.current) {
                clearTimeout(insertReloadTimerRef.current)
              }
              // Debounce reload to handle multiple INSERT events (when recreating multiple slots)
              // But make it fast (100ms) so it feels immediate
              insertReloadTimerRef.current = setTimeout(() => {
                if (loadSlotsRef.current) {
                  console.log('🔄 Executing reload after INSERT event(s)')
                  loadSlotsRef.current()
                }
                insertReloadTimerRef.current = null
              }, 100)
              return // Skip adding to state, reload will update it
            }
            
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
              
              const updated = [...prev, newSlot]
              slotsCountRef.current = updated.length
              return updated
            })
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setSlots((prev) => {
              const updated = prev.map((slot) => (slot.id === payload.new.id ? (payload.new as Slot) : slot))
              slotsCountRef.current = updated.length
              return updated
            })
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Track DELETE events - if we get multiple in quick succession, it's likely a bulk delete
            deleteEventCountRef.current += 1
            
            const previousCount = slotsCountRef.current
            
            console.log('🗑️ DELETE event received:', {
              slotId: payload.old.id,
              slotName: payload.old.name,
              deleteCount: deleteEventCountRef.current,
              previousSlotsCount: previousCount,
              userId
            })
            
            // Remove the deleted slot from state first
            setSlots((prev) => {
              const filtered = prev.filter((slot) => slot.id !== payload.old.id)
              slotsCountRef.current = filtered.length // Update ref
              return filtered
            })
            
            // Clear any existing delete timer
            if (deleteEventTimerRef.current) {
              clearTimeout(deleteEventTimerRef.current)
            }
            
            // Clear any existing debounce timer
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current)
            }
            
            // AGGRESSIVE: Reload on ANY DELETE if we had more than 1 slot (likely bulk delete)
            // Also reload immediately if list becomes empty
            if (previousCount > 1 || slotsCountRef.current === 0) {
              // Reload immediately - don't wait, bulk deletes might send all events at once
              console.log('🔄 Reloading immediately after DELETE - deleteCount:', deleteEventCountRef.current, 'previousCount:', previousCount, 'remainingSlots:', slotsCountRef.current, 'userId:', userId)
              deleteEventCountRef.current = 0
              if (loadSlotsRef.current) {
                // Use a tiny delay (50ms) to ensure state update completes first
                setTimeout(() => {
                  if (loadSlotsRef.current) {
                    loadSlotsRef.current()
                  }
                }, 50)
              }
            } else {
              // For single slot deletes, reset counter after 1 second
              deleteEventTimerRef.current = setTimeout(() => {
                deleteEventCountRef.current = 0
              }, 1000)
            }
          }
          // Note: We don't reload here - real-time payload has the latest data!
        }
      )
      .subscribe((status) => {
        console.log('Supabase subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to slots updates')
        }
      })

    // Cleanup subscription on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (deleteEventTimerRef.current) {
        clearTimeout(deleteEventTimerRef.current)
      }
      if (insertReloadTimerRef.current) {
        clearTimeout(insertReloadTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [userId]) // Removed loadSlots from deps to prevent re-subscriptions

  return { slots, loading, error, refetch: loadSlots }
}

