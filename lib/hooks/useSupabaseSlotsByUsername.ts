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
  const loadSlotsRef = useRef<() => Promise<void>>()
  const deleteEventCountRef = useRef(0) // Track rapid DELETE events (bulk delete)
  const deleteEventTimerRef = useRef<NodeJS.Timeout | null>(null)
  const slotsCountRef = useRef(0) // Track current slots count for bulk delete detection
  const insertReloadTimerRef = useRef<NodeJS.Timeout | null>(null) // Debounce reloads from INSERT events

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
        slotsCountRef.current = uniqueSlots.length // Update ref with current count
        // Extract userId from first slot if available
        if (uniqueSlots.length > 0 && uniqueSlots[0].userId) {
          userIdRef.current = uniqueSlots[0].userId
        }
        setError(null)
      } else {
        setSlots([])
        slotsCountRef.current = 0
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

  // Keep ref updated with latest loadSlots function
  useEffect(() => {
    loadSlotsRef.current = loadSlots
  }, [loadSlots])

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
    // OPTIMIZATION: Increased debounce to 2 seconds to reduce API calls and function duration costs
    const debouncedReload = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        // Use ref to get latest loadSlots function
        if (loadSlotsRef.current) {
          loadSlotsRef.current()
        }
      }, 2000) // Wait 2 seconds after last change before reloading (increased from 500ms)
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
          // Log ALL events to debug
          console.log('📡 Real-time slot event received (ALL):', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new,
            old: payload.old,
            username,
            ourUserId: userIdRef.current
          })
          
          // Only process if it matches our user's slots
          const changedSlot = payload.new || payload.old
          
          if (!changedSlot) {
            console.log('⚠️ Event has no new or old data, skipping')
            return
          }
          
          console.log('Real-time slot event received:', {
            eventType: payload.eventType,
            slotId: changedSlot?.id,
            slotName: changedSlot?.name,
            slotUserId: changedSlot?.userId,
            ourUserId: userIdRef.current,
            username,
            prevWin: payload.old?.win,
            newWin: payload.new?.win
          })
          
          // If userId not loaded yet, reload to get it and process the change
          if (!userIdRef.current && changedSlot) {
            console.log('Received real-time event but userId not loaded yet, reloading to get latest data:', payload.eventType)
            debouncedReload()
            return
          }
          
          // For DELETE events, process if we have slots locally (userId might not be in payload.old)
          // For INSERT/UPDATE events, check if it matches our user's slots
          const isDeleteEvent = payload.eventType === 'DELETE' && payload.old
          const hasSlotsLocally = slotsCountRef.current > 0
          const matchesOurUser = changedSlot && changedSlot.userId === userIdRef.current
          
          // Process DELETE events if we have slots locally (even if userId is missing from payload.old)
          // Process INSERT/UPDATE events if they match our user
          if ((isDeleteEvent && hasSlotsLocally) || (matchesOurUser && !isDeleteEvent)) {
            console.log('Slot change matches our user - processing:', payload.eventType, {
              slotId: changedSlot?.id,
              slotName: changedSlot?.name,
              win: payload.new?.win ?? payload.old?.win,
              prevWin: payload.old?.win,
              newWin: payload.new?.win,
              isDeleteEvent,
              hasSlotsLocally,
              matchesOurUser
            })
            
            // Update state directly for immediate feedback
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
                  username
                })
                // Clear any existing reload timer
                if (insertReloadTimerRef.current) {
                  clearTimeout(insertReloadTimerRef.current)
                }
                // Debounce reload to handle multiple INSERT events (when recreating multiple slots)
                // OPTIMIZATION: Increased to 1 second to reduce API calls
                insertReloadTimerRef.current = setTimeout(() => {
                  if (loadSlotsRef.current) {
                    console.log('🔄 Executing reload after INSERT event(s)')
                    loadSlotsRef.current()
                  }
                  insertReloadTimerRef.current = null
                }, 1000) // Increased from 100ms to 1s to reduce function duration costs
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
              // Update slot - this handles both win being added AND win being deleted (set to null)
              const updatedSlot = payload.new as Slot
              setSlots((prev) => {
                const existingIndex = prev.findIndex((slot) => slot.id === updatedSlot.id)
                if (existingIndex >= 0) {
                  // Slot exists, update it
                  const updated = prev.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot))
                  slotsCountRef.current = updated.length
                  console.log('Slot updated via real-time:', updatedSlot.name, 'Win changed from', payload.old?.win, 'to', updatedSlot.win)
                  return updated
                } else {
                  // Slot doesn't exist in our list yet - reload to get all slots
                  console.log('Slot updated but not in current list, reloading to get latest data:', updatedSlot.name)
                  debouncedReload()
                  return prev // Return current state while reloading
                }
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
                username
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
                console.log('🔄 Reloading immediately after DELETE - deleteCount:', deleteEventCountRef.current, 'previousCount:', previousCount, 'remainingSlots:', slotsCountRef.current, 'username:', username)
                deleteEventCountRef.current = 0
                if (loadSlotsRef.current) {
                  // OPTIMIZATION: Increased delay to 500ms to batch multiple DELETE events and reduce API calls
                  setTimeout(() => {
                    if (loadSlotsRef.current) {
                      loadSlotsRef.current()
                    }
                  }, 500) // Increased from 50ms to 500ms to reduce function duration costs
                }
              } else {
                // For single slot deletes, reset counter after 1 second
                deleteEventTimerRef.current = setTimeout(() => {
                  deleteEventCountRef.current = 0
                }, 1000)
              }
            } else {
              // For batch operations or uncertainty, reload after debounce
              console.log('Unknown event type or batch operation, reloading:', payload.eventType)
              debouncedReload()
            }
          } else {
            console.log('Slot event filtered out - wrong user:', {
              slotUserId: changedSlot?.userId,
              ourUserId: userIdRef.current,
              username
            })
          }
          
          // WORKAROUND: If we have slots locally but receive an INSERT event for a slot we don't have,
          // it might mean all slots were cleared and new ones are being added
          // This helps catch bulk deletes that don't fire DELETE events
          if (payload.eventType === 'INSERT' && payload.new && slotsCountRef.current === 0) {
            console.log('🔍 Detected INSERT event but local slots are empty - might be after bulk delete, reloading')
            if (loadSlotsRef.current) {
              setTimeout(() => {
                if (loadSlotsRef.current) {
                  loadSlotsRef.current()
                }
              }, 100)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Supabase subscription status for slots:', status, 'username:', username)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to slots updates for', username)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error subscribing to slots updates for', username)
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Subscription timed out for slots updates for', username)
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Subscription closed for slots updates for', username)
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
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [username]) // Removed loadSlots from deps to prevent re-subscriptions

  return { slots, loading, error, refetch: loadSlots }
}

