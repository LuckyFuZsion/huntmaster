"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

export default function HuntStatisticsSummary() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)
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
      const session = localStorage.getItem("huntmaster_session")
      if (session) {
        try {
          const response = await fetch("/api/user-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, action: "get" }) })
          const data = await response.json()
          if (data.success && data.settings) {
            setStartBalance(Number.parseFloat(data.settings.startBalance) || 0)
            setEndBalance(Number.parseFloat(data.settings.endBalance) || 0)
          }
        } catch (error) {
          console.error("Error loading user settings:", error)
        }
      }
    }

    loadData()
    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [username])

  const totalWinAmount = slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0)
  const openedBonuses = slots.filter((slot) => slot.win !== null).length
  const avgXWin =
    openedBonuses > 0
      ? slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) / Number(slot.bet) : 0), 0) /
        openedBonuses
      : 0
  const remainingBalance = startBalance - (endBalance + totalWinAmount)
  const profit = totalWinAmount - (startBalance - endBalance)

  return (
    <div
      style={{
        width: "350px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderRadius: "10px",
        padding: "15px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#fff",
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "15px", textAlign: "center" }}>
        Hunt Statistics
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <StatItem label="Total Bonuses" value={slots.length.toString()} />
        <StatItem label="Opened" value={openedBonuses.toString()} />
        <StatItem label="Total Win" value={totalWinAmount.toFixed(2)} />
        <StatItem label="Avg. Multiplier" value={`${avgXWin.toFixed(2)}x`} />
        {profit > 0 ? (
          <StatItem label="Profit" value={`$${profit.toFixed(2)}`} color="#4CAF50" />
        ) : (
          <StatItem label="Remaining" value={`$${remainingBalance.toFixed(2)}`} />
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ fontSize: "14px", color: "#8BB8E8" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: "bold", color: color }}>{value}</div>
    </div>
  )
}
