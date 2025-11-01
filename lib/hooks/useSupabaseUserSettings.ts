import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface UserSettings {
  id: string
  userId: string
  startBalance: string
  endBalance: string
  colourTheme: string
  selectedFont: string
  fontSize: number
  cornerRadius: string
  updatedAt: string
}

/**
 * Hook to subscribe to real-time user settings updates
 * Replaces polling with push-based updates using Supabase real-time
 */
export function useSupabaseUserSettings(userId: string | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const loadSettingsRef = useRef<() => Promise<void>>()

  const loadSettings = useCallback(async () => {
    if (!userId) {
      setSettings(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: localStorage.getItem('huntmaster_session'),
          action: 'get',
        }),
      })

      const data = await response.json()
      if (data.success && data.settings) {
        console.log('Settings loaded from API:', data.settings)
        setSettings(data.settings)
        setError(null)
      } else {
        console.log('No settings found or API error:', data)
        setSettings(null)
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError(err instanceof Error ? err : new Error('Failed to load settings'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Keep ref updated
  useEffect(() => {
    loadSettingsRef.current = loadSettings
  }, [loadSettings])

  useEffect(() => {
    if (!userId) {
      setSettings(null)
      setLoading(false)
      return
    }

    let channel: any = null

    // Load initial data
    loadSettings()

    // Subscribe to real-time changes for this user's settings
    channel = supabase
      .channel(`userSettings:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'userSettings',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log('User settings change detected:', payload.eventType, payload)
          // Update state directly from payload for immediate feedback
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            if (payload.new) {
              console.log('Updating settings from real-time payload:', payload.new)
              setSettings(payload.new as UserSettings)
            } else {
              // If no new data, reload to get fresh data
              console.log('No new data in payload, reloading settings')
              if (loadSettingsRef.current) {
                loadSettingsRef.current()
              }
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('Settings deleted, clearing state')
            setSettings(null)
          }
          // Fallback: reload if payload doesn't have new data
          if (!payload.new && !payload.old && loadSettingsRef.current) {
            console.log('Fallback: reloading settings')
            loadSettingsRef.current()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to user settings updates')
        }
      })

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId]) // Removed loadSettings from deps to prevent re-subscriptions

  return { settings, loading, error, refetch: loadSettings }
}

