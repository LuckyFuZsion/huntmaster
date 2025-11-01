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
        setError(null)
      } else {
        setSlots([])
      }
    } catch (err) {
      console.error('Error loading slots:', err)
      setError(err instanceof Error ? err : new Error('Failed to load slots'))
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setSlots([])
      setLoading(false)
      return
    }

    // Load initial data
    loadSlots()

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
            setSlots((prev) =>
              prev.map((slot) => (slot.id === payload.new.id ? (payload.new as Slot) : slot))
            )
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setSlots((prev) => prev.filter((slot) => slot.id !== payload.old.id))
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
      supabase.removeChannel(channel)
    }
  }, [userId]) // Removed loadSlots from deps to prevent re-subscriptions

  return { slots, loading, error, refetch: loadSlots }
}

