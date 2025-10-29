"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

function NextBonusWidgetContent() {
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

export default function NextBonusWidget() {
  return (
    <Suspense fallback={
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
        <div style={{ fontSize: "18px", color: "#8BB8E8" }}>Loading...</div>
      </div>
    }>
      <NextBonusWidgetContent />
    </Suspense>
  )
}
