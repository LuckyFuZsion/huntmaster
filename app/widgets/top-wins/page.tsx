"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

export default function TopWinsLeaderboard() {
  const [slots, setSlots] = useState<Slot[]>([])
  const searchParams = useSearchParams()
  const username = searchParams.get("user")

  useEffect(() => {
    const loadSlotsFromFirestore = async () => {
      try {
        if (username) {
          const response = await fetch(`/api/slots/by-username?username=${username}`)
          const data = await response.json()
          if (data.success && data.slots) {
            setSlots(data.slots.map((slot: any) => ({ id: slot.id, name: slot.name, bet: slot.bet, win: slot.win })))
          }
        } else {
          const session = localStorage.getItem("huntmaster_session")
          if (session) {
            const response = await fetch("/api/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, action: "get" }) })
            const data = await response.json()
            if (data.success && data.slots) {
              setSlots(data.slots.map((slot: any) => ({ id: slot.id, name: slot.name, bet: slot.bet, win: slot.win })))
            }
          }
        }
      } catch (error) {
        console.error("Error loading slots:", error)
      }
    }

    const loadData = async () => {
      await loadSlotsFromFirestore()
    }

    loadData()
    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [username])

  const topWins = slots
    .filter((slot) => slot.win !== null)
    .sort((a, b) => (b.win || 0) - (a.win || 0))
    .slice(0, 5)

  return (
    <div
      style={{
        width: "300px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderRadius: "10px",
        padding: "15px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#fff",
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "15px", textAlign: "center" }}>Top 5 Wins</div>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
        <thead>
          <tr style={{ fontSize: "18px", color: "#8BB8E8" }}>
            <th style={{ textAlign: "left", padding: "5px" }}>Slot</th>
            <th style={{ textAlign: "right", padding: "5px" }}>Win</th>
            <th style={{ textAlign: "right", padding: "5px" }}>Multiplier</th>
          </tr>
        </thead>
        <tbody>
          {topWins.map((slot, index) => (
            <tr key={slot.id} style={{ background: index % 2 === 0 ? "rgba(255,255,255,0.05)" : "transparent" }}>
              <td style={{ padding: "8px", fontSize: "16px" }}>{slot.name}</td>
              <td style={{ padding: "8px", fontSize: "16px", textAlign: "right" }}>
                {slot.win !== null ? `${slot.win.toFixed(2)}` : "-"}
              </td>
              <td style={{ padding: "8px", fontSize: "16px", textAlign: "right", color: "#ffd700" }}>
                {slot.win && slot.bet ? `${(slot.win / slot.bet).toFixed(2)}x` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
