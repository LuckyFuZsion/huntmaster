"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseSlotsByUsername } from "@/lib/hooks/useSupabaseSlotsByUsername"
import { useSupabaseSlots } from "@/lib/hooks/useSupabaseSlots"
import { decrypt } from "@/lib/protection"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

function NextBonusWidgetContent() {
  const searchParams = useSearchParams()
  const username = searchParams.get("user")
  const [userId, setUserId] = useState<string | null>(null)

  // Use real-time subscriptions
  const slotsByUsername = useSupabaseSlotsByUsername(username || null)
  const slotsByUserId = useSupabaseSlots(username ? null : userId)

  const slotsData = username ? slotsByUsername : slotsByUserId

  const slots: Slot[] = (slotsData?.slots || []).map((slot: any) => ({
    id: slot.id,
    name: slot.name,
    bet: slot.bet,
    win: slot.win,
  }))

  useEffect(() => {
    if (!username) {
      const session = localStorage.getItem("huntmaster_session")
      if (session) {
        try {
          const sessionData = JSON.parse(decrypt(session))
          setUserId(sessionData.userId || null)
        } catch (error) {
          setUserId(null)
        }
      }
    }
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
