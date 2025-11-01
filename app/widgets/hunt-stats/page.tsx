"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseSlotsByUsername } from "@/lib/hooks/useSupabaseSlotsByUsername"
import { useSupabaseUserSettingsByUsername } from "@/lib/hooks/useSupabaseUserSettingsByUsername"
import { useSupabaseSlots } from "@/lib/hooks/useSupabaseSlots"
import { useSupabaseUserSettings } from "@/lib/hooks/useSupabaseUserSettings"
import { decrypt } from "@/lib/protection"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

function HuntStatisticsSummaryContent() {
  const searchParams = useSearchParams()
  const username = searchParams.get("user")
  const [userId, setUserId] = useState<string | null>(null)
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)

  // Use real-time subscriptions
  const slotsByUsername = useSupabaseSlotsByUsername(username || null)
  const slotsByUserId = useSupabaseSlots(username ? null : userId)
  const settingsByUsername = useSupabaseUserSettingsByUsername(username || null)
  const settingsByUserId = useSupabaseUserSettings(username ? null : userId)

  const slotsData = username ? slotsByUsername : slotsByUserId
  const settingsData = username ? settingsByUsername : settingsByUserId

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

  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings
      // Only update if value exists (not null/undefined/empty)
      if (s.startBalance != null && s.startBalance !== "") {
        setStartBalance(Number.parseFloat(s.startBalance) || 0)
      }
      if (s.endBalance != null && s.endBalance !== "") {
        setEndBalance(Number.parseFloat(s.endBalance) || 0)
      }
    }
  }, [settingsData?.settings])

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

export default function HuntStatisticsSummary() {
  return (
    <Suspense fallback={
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
        <div style={{ textAlign: "center", color: "#8BB8E8" }}>Loading...</div>
      </div>
    }>
      <HuntStatisticsSummaryContent />
    </Suspense>
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
