"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Trophy, Zap, Sparkles, Flame, Skull, DollarSign } from "lucide-react"
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

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase()).replace(/'S\b/g, "'s") // Fix apostrophe + S at the end of words
}

export default function OBSBrowserSource5() {
  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "600px"
  const borderRadius = searchParams.get("radius") || "20px"
  const username = searchParams.get("user")
  const [userId, setUserId] = useState<string | null>(null)
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)
  const [currentStats, setCurrentStats] = useState(0)

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStats((prev) => (prev + 1) % 2)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const totalWinAmount = slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0)
  const openedBonuses = slots.filter((slot) => slot.win !== null).length
  const totalBonuses = slots.length
  const avgXWin =
    openedBonuses > 0
      ? slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) / Number(slot.bet) : 0), 0) /
        openedBonuses
      : 0
  const biggestWin = Math.max(...slots.map((slot) => (slot.win !== null ? Number(slot.win) : 0)))
  const biggestWinSlot = slots.find((slot) => slot.win !== null && Number(slot.win) === biggestWin)
  const biggestMulti = Math.max(...slots.map((slot) => (slot.win !== null ? Number(slot.win) / Number(slot.bet) : 0)))
  const biggestMultiSlot = slots.find(
    (slot) => slot.win !== null && Number(slot.win) / Number(slot.bet) === biggestMulti,
  )

  const remainingBalance = startBalance - (endBalance + totalWinAmount)
  const remainingBetSize = slots.reduce((sum, slot) => sum + (slot.win === null ? Number(slot.bet) : 0), 0)
  const avgXReq = remainingBetSize > 0 ? remainingBalance / remainingBetSize : 0
  const usedBalance = startBalance - endBalance
  const isProfit = remainingBalance <= 0
  const profitAmount = isProfit ? Math.abs(remainingBalance) : 0

  return (
    <div
      style={{
        width: "700px",
        height: size,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        borderRadius: borderRadius,
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(90deg, #4a00e0, #8e2de2)",
          padding: "10px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "4px solid #8e2de2",
        }}
      >
        <div style={{ fontSize: "28px", fontWeight: "bold" }}>🎰 BONUS HUNT</div>
        <div style={{ fontSize: "24px" }}>
          {openedBonuses}/{totalBonuses}
          <span style={{ marginLeft: "20px", color: "#ffd700" }}>
            {totalBonuses > 0 ? ((openedBonuses / totalBonuses) * 100).toFixed(0) : 0}%
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          padding: "10px 20px",
          background: "rgba(255,255,255,0.05)",
        }}
      >
        <RotatingStatBox
          icon1={<DollarSign size={32} color="#ffd700" />}
          label1="START BAL"
          value1={startBalance.toFixed(2)}
          icon2={<DollarSign size={32} color="#ffd700" />}
          label2="USED BAL"
          value2={usedBalance.toFixed(2)}
          currentStats={currentStats}
        />
        <RotatingStatBox
          icon1={<Zap size={32} color="#00ff00" />}
          label1="AVG X"
          value1={avgXWin.toFixed(2)}
          icon2={<DollarSign size={32} color="#00ff00" />}
          label2="END BAL"
          value2={endBalance.toFixed(2)}
          currentStats={currentStats}
        />
        <RotatingStatBox
          icon1={<Sparkles size={32} color="#ff00ff" />}
          label1="TOTAL WIN"
          value1={totalWinAmount.toFixed(2)}
          icon2={<DollarSign size={32} color="#ff00ff" />}
          label2={isProfit ? "PROFIT" : "REMAINING"}
          value2={isProfit ? profitAmount.toFixed(2) : remainingBalance.toFixed(2)}
          isProfit={isProfit}
          currentStats={currentStats}
        />
        <RotatingStatBox
          icon1={<Flame size={32} color="#ff4500" />}
          label1="AVG X REQ"
          value1={avgXReq.toFixed(2)}
          icon2={<div style={{ width: "32px", height: "32px" }} />}
          label2=""
          value2=""
          currentStats={currentStats}
        />
      </div>

      {/* Highlight Rows */}
      <div
        style={{
          background: "rgba(0,0,0,0.2)",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "48%" }}>
          <Trophy size={28} color="#ffd700" />
          <div style={{ overflow: "hidden", width: "calc(100% - 38px)" }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {biggestWinSlot ? capitalizeWords(biggestWinSlot.name) : "-"}
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ffd700" }}>
              {biggestWin ? biggestWin.toFixed(2) : "-"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "48%" }}>
          <Skull size={28} color="#ff6b6b" />
          <div style={{ overflow: "hidden", width: "calc(100% - 38px)" }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {biggestMultiSlot ? capitalizeWords(biggestMultiSlot.name) : "-"}
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ff6b6b" }}>
              {biggestMulti ? `${Math.round(biggestMulti)}x` : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Static Menu */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: "rgba(0,0,0,0.3)",
          fontSize: "22px",
          fontWeight: "bold",
        }}
      >
        <div style={{ width: "60%", textAlign: "left" }}>SLOT</div>
        <div style={{ width: "10%", textAlign: "right" }}>BET</div>
        <div style={{ width: "20%", textAlign: "right" }}>WIN</div>
        <div style={{ width: "10%", textAlign: "right" }}>X</div>
      </div>

      {/* Scrolling Slot List */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            animation: `scroll ${Math.max(slots.length, 2) * 5}s linear infinite`,
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[...slots, ...slots].map((slot, index) => (
                <tr
                  key={`${slot.id}-${index}`}
                  style={{
                    background: index % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      fontFamily: "'Arial', sans-serif",
                      width: "60%",
                    }}
                  >
                    {(index % slots.length) + 1}. {capitalizeWords(slot.name)}
                  </td>
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      fontFamily: "'Arial', sans-serif",
                      width: "10%",
                      textAlign: "right",
                    }}
                  >
                    {slot.bet.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      fontFamily: "'Arial', sans-serif",
                      width: "20%",
                      textAlign: "right",
                    }}
                  >
                    {slot.win !== null ? slot.win.toFixed(2) : "xx"}
                  </td>
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      fontFamily: "'Arial', sans-serif",
                      width: "10%",
                      textAlign: "right",
                    }}
                  >
                    {slot.win !== null ? `${Math.round(Number(slot.win) / Number(slot.bet))}x` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "linear-gradient(90deg, #4a00e0, #8e2de2)",
          padding: "10px 30px",
          fontSize: "20px",
          textAlign: "center",
        }}
      >
        Huntmaster - Created by LuckyFuZsion
      </div>

      <style>
        {`
          @keyframes scroll {
            0% { transform: translateY(0); }
            100% { transform: translateY(-${50}%); }
          }
        `}
      </style>
    </div>
  )
}

function RotatingStatBox({
  icon1,
  label1,
  value1,
  icon2,
  label2,
  value2,
  currentStats,
  isProfit,
}: {
  icon1: React.ReactNode
  label1: string
  value1: string | number
  icon2: React.ReactNode
  label2: string
  value2: string | number
  currentStats: number
  isProfit?: boolean
}) {
  return (
    <div style={{ position: "relative", overflow: "hidden", height: "60px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          transition: "transform 0.5s ease-in-out",
          transform: `translateY(${currentStats === 0 ? "0" : "-100%"})`,
        }}
      >
        {icon1}
        <div>
          <div style={{ fontSize: "18px", color: "#fff", fontWeight: "bold" }}>{label1}</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ffd700" }}>{value1}</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          transition: "transform 0.5s ease-in-out",
          transform: `translateY(${currentStats === 1 ? "-100%" : "0"})`,
        }}
      >
        {icon2}
        <div>
          <div style={{ fontSize: "18px", color: "#fff", fontWeight: "bold" }}>{label2}</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: isProfit ? "#00ff00" : "#ffd700" }}>{value2}</div>
        </div>
      </div>
    </div>
  )
}
