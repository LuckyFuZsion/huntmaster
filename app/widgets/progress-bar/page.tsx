"use client"

import { useState, useEffect } from "react"

export default function BonusHuntProgressBar() {
  const [slots, setSlots] = useState<any[]>([])

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

  const openedBonuses = slots.filter((slot) => slot.win !== null).length
  const totalBonuses = slots.length
  const progressPercentage = totalBonuses > 0 ? (openedBonuses / totalBonuses) * 100 : 0

  return (
    <div
      style={{
        width: "400px",
        height: "100px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderRadius: "10px",
        padding: "10px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px", textAlign: "center" }}>
        Bonus Hunt Progress
      </div>
      <div
        style={{
          position: "relative",
          height: "30px",
          background: "#2a2a2a",
          borderRadius: "15px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${progressPercentage}%`,
            background: "linear-gradient(90deg, #4a00e0, #8e2de2)",
            transition: "width 0.5s ease-in-out",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "bold",
          }}
        >
          {openedBonuses} / {totalBonuses} ({progressPercentage.toFixed(1)}%)
        </div>
      </div>
    </div>
  )
}

