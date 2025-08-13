"use client"

import { useState, useEffect } from "react"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

export default function NextBonusWidget() {
  const [slots, setSlots] = useState<Slot[]>([])

  useEffect(() => {
    const loadData = () => {
      const storedSlots = localStorage.getItem("slotList")
      if (storedSlots) {
        setSlots(JSON.parse(storedSlots))
      }
    }

    loadData()
    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [])

  const nextBonus = slots.find((slot) => slot.win === null)

  return (
    <div
      style={{
        width: "300px",
        height: "100px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderRadius: "10px",
        padding: "15px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px" }}>Next Bonus</div>
      {nextBonus ? (
        <>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffd700" }}>{nextBonus.name}</div>
          <div style={{ fontSize: "18px", marginTop: "5px" }}>Bet: {nextBonus.bet.toFixed(2)}</div>
        </>
      ) : (
        <div style={{ fontSize: "18px", color: "#8BB8E8" }}>All bonuses opened!</div>
      )}
    </div>
  )
}
