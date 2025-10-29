import { useState, useEffect } from "react"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

export function useFirestoreSlots(username?: string | null) {
  const [slots, setSlots] = useState<Slot[]>([])

  useEffect(() => {
    const loadSlots = async () => {
      try {
        // If username is provided, load that user's slots
        if (username) {
          const response = await fetch(`/api/slots/by-username?username=${username}`)
          const data = await response.json()
          if (data.success && data.slots) {
            setSlots(data.slots.map((slot: any) => ({
              id: slot.id,
              name: slot.name,
              bet: slot.bet,
              win: slot.win,
            })))
          }
        } else {
          // Fallback to session-based loading
          const session = localStorage.getItem("huntmaster_session")
          if (session) {
            const response = await fetch("/api/slots", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ session, action: "get" }),
            })
            const data = await response.json()
            if (data.success && data.slots) {
              setSlots(data.slots.map((slot: any) => ({
                id: slot.id,
                name: slot.name,
                bet: slot.bet,
                win: slot.win,
              })))
            }
          }
        }
      } catch (error) {
        console.error("Error loading slots:", error)
      }
    }

    loadSlots()

    // Set up an interval to check for updates
    const interval = setInterval(loadSlots, 2000) // Check every 2 seconds

    return () => clearInterval(interval)
  }, [username])

  return slots
}

