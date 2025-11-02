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
 * Hook to subscribe to real-time user settings updates by username
 * Used by OBS browser sources and widgets
 */
export function useSupabaseUserSettingsByUsername(username: string | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const userIdRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  const loadSettings = useCallback(async () => {
    if (!username) {
      setSettings(null)
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
      const response = await fetch(`/api/user-settings/by-username?username=${encodeURIComponent(username)}`)
      const data = await response.json()
      if (data.success && data.settings) {
        setSettings(data.settings)
        if (data.settings.userId) {
          userIdRef.current = data.settings.userId
        }
        setError(null)
      } else {
        setSettings(null)
        userIdRef.current = null
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError(err instanceof Error ? err : new Error('Failed to load settings'))
      userIdRef.current = null
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [username])

  useEffect(() => {
    if (!username) {
      setSettings(null)
      setLoading(false)
      return
    }

    let channel: any = null

    loadSettings()

    // Subscribe to real-time changes
    channel = supabase
      .channel(`userSettings:username:${username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'userSettings',
        },
        (payload) => {
          const changedSettings = payload.new || payload.old
          if (changedSettings && changedSettings.userId === userIdRef.current) {
            console.log('User settings change detected for', username, ':', payload.eventType)
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              setSettings(payload.new as UserSettings)
            } else if (payload.eventType === 'DELETE') {
              setSettings(null)
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to user settings updates for', username)
        }
      })

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [username])

  return { settings, loading, error, refetch: loadSettings }
}



