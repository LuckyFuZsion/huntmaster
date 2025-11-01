"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseSlotsByUsername } from "@/lib/hooks/useSupabaseSlotsByUsername"
import { useSupabaseSlots } from "@/lib/hooks/useSupabaseSlots"
import { decrypt } from "@/lib/protection"

function BonusHuntProgressBarContent() {
  const searchParams = useSearchParams()
  const username = searchParams.get("user")
  const [userId, setUserId] = useState<string | null>(null)

  // Use real-time subscriptions
  const slotsByUsername = useSupabaseSlotsByUsername(username || null)
  const slotsByUserId = useSupabaseSlots(username ? null : userId)

  const slotsData = username ? slotsByUsername : slotsByUserId

  const slots: any[] = (slotsData?.slots || []).map((slot: any) => ({
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

export default function BonusHuntProgressBar() {
  return (
    <Suspense fallback={
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
        <div style={{ textAlign: "center", color: "#8BB8E8" }}>Loading...</div>
      </div>
    }>
      <BonusHuntProgressBarContent />
    </Suspense>
  )
}
