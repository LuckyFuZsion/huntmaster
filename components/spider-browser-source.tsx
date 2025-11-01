"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Trophy, Zap, Sparkles, Flame, Skull, DollarSign } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useSupabaseSlotsByUsername } from "@/lib/hooks/useSupabaseSlotsByUsername"
import { useSupabaseUserSettingsByUsername } from "@/lib/hooks/useSupabaseUserSettingsByUsername"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase()).replace(/'S\b/g, "'s") // Fix apostrophe + S at the end of words
}

// Default values
const defaultHeaderText = "🕷️ 🎰 BONUS HUNT"
const defaultFooterText = "Huntmaster - Created by LuckyFuZsion"

// Default text colors
const defaultTextColors = {
  headerText: "#ffffff",
  statsLabels: "#ffffff",
  statsValues: "#ffd700",
  tableHeaders: "#8BB8E8",
  tableContent: "#ffffff",
  biggestWinLabel: "#ffffff",
  biggestWinValue: "#ffd700",
  biggestMultiLabel: "#ffffff",
  biggestMultiValue: "#ff6b6b",
  progressText: "#ffd700",
}

export default function SpiderBrowserSource() {
  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "600px"
  const username = searchParams.get("user")

  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)
  const [currentStats, setCurrentStats] = useState(0)

  const [colors, setColors] = useState({
    headerStart: "#1a00ba",
    headerEnd: "#0a0060",
    footerStart: "#1a00ba",
    footerEnd: "#0a0060",
    tableEven: "rgba(255,255,255,0.03)",
    tableOdd: "transparent",
    fontColor: "#ffffff",
    borderColor: "#ffffff",
  })

  const [textColors, setTextColors] = useState(defaultTextColors)
  const [fontFamily, setFontFamily] = useState("Arial")
  const [borderWidth, setBorderWidth] = useState(1)
  const [headerText, setHeaderText] = useState(defaultHeaderText)
  // Footer text is fixed and cannot be changed
  const footerText = defaultFooterText

  // Use real-time subscriptions for slots and settings
  const slotsData = useSupabaseSlotsByUsername(username || null)
  const settingsData = useSupabaseUserSettingsByUsername(username || null)

  const slots: Slot[] = (slotsData?.slots || []).map((slot: any) => ({
    id: slot.id,
    name: slot.name,
    bet: slot.bet,
    win: slot.win,
  })).filter((slot, index, self) => 
    // Additional deduplication safeguard: keep only first occurrence of each ID or name
    index === self.findIndex((s) => s.id === slot.id || s.name.toLowerCase().trim() === slot.name.toLowerCase().trim())
  )

  // Update balance from real-time settings
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
      
      // Update spider-specific settings
      if (s.spiderColors) {
        setColors(s.spiderColors)
      }
      if (s.spiderTextColors) {
        setTextColors(s.spiderTextColors)
      }
      if (s.spiderFontFamily) {
        setFontFamily(s.spiderFontFamily)
      }
      if (s.spiderBorderWidth !== undefined) {
        setBorderWidth(s.spiderBorderWidth)
      }
      if (s.spiderHeaderText) {
        setHeaderText(s.spiderHeaderText)
      }
    }
  }, [settingsData?.settings])

  // Fallback to localStorage if no username (for backwards compatibility)
  useEffect(() => {
    if (!username) {
      const storedSlots = localStorage.getItem("slotList")
      if (storedSlots) {
        // Note: Real-time subscriptions won't work without username
        // This is a fallback for backwards compatibility only
      }

      const storedStartBalance = localStorage.getItem("startBalance")
      if (storedStartBalance) {
        setStartBalance(Number.parseFloat(storedStartBalance))
      }

      const storedEndBalance = localStorage.getItem("endBalance")
      if (storedEndBalance) {
        setEndBalance(Number.parseFloat(storedEndBalance))
      }

      const storedColors = localStorage.getItem("spiderColors")
      if (storedColors) {
        setColors(JSON.parse(storedColors))
      }

      const storedTextColors = localStorage.getItem("spiderTextColors")
      if (storedTextColors) {
        setTextColors(JSON.parse(storedTextColors))
      }

      const storedFontFamily = localStorage.getItem("spiderFontFamily")
      if (storedFontFamily) {
        setFontFamily(storedFontFamily)
      }

      const storedBorderWidth = localStorage.getItem("spiderBorderWidth")
      if (storedBorderWidth) {
        setBorderWidth(Number.parseInt(storedBorderWidth))
      }

      const storedHeaderText = localStorage.getItem("spiderHeaderText")
      if (storedHeaderText) {
        setHeaderText(storedHeaderText)
      }
    }
  }, [username])

  // Set up stats rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStats((prev) => (prev + 1) % 2)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Calculate stats
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

  return (
    <div
      style={{
        width: "700px",
        height: size,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        color: "#fff",
        fontFamily: fontFamily,
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        border: `${borderWidth}px solid ${colors.borderColor || "#ffffff"}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(to bottom, ${colors.headerStart}, ${colors.headerEnd})`,
          padding: "10px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `4px solid ${colors.headerEnd}`,
        }}
      >
        <div style={{ fontSize: "28px", fontWeight: "bold", color: textColors.headerText }}>{headerText}</div>
        <div style={{ fontSize: "24px", color: textColors.headerText }}>
          {openedBonuses}/{totalBonuses}
          <span style={{ marginLeft: "20px", color: textColors.progressText }}>
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
          icon1={<DollarSign size={32} color={textColors.statsValues} />}
          label1="START BAL"
          value1={startBalance.toFixed(2)}
          icon2={<DollarSign size={32} color={textColors.statsValues} />}
          label2="USED BAL"
          value2={usedBalance.toFixed(2)}
          currentStats={currentStats}
          labelColor={textColors.statsLabels}
          valueColor={textColors.statsValues}
        />
        <RotatingStatBox
          icon1={<Zap size={32} color={textColors.statsValues} />}
          label1="AVG X"
          value1={avgXWin.toFixed(2)}
          icon2={<DollarSign size={32} color={textColors.statsValues} />}
          label2="END BAL"
          value2={endBalance.toFixed(2)}
          currentStats={currentStats}
          labelColor={textColors.statsLabels}
          valueColor={textColors.statsValues}
        />
        <RotatingStatBox
          icon1={<Sparkles size={32} color={textColors.statsValues} />}
          label1="TOTAL WIN"
          value1={totalWinAmount.toFixed(2)}
          icon2={<DollarSign size={32} color={textColors.statsValues} />}
          label2="REMAINING"
          value2={remainingBalance.toFixed(2)}
          currentStats={currentStats}
          labelColor={textColors.statsLabels}
          valueColor={textColors.statsValues}
        />
        <RotatingStatBox
          icon1={<Flame size={32} color={textColors.statsValues} />}
          label1="AVG X REQ"
          value1={avgXReq.toFixed(2)}
          icon2={<div style={{ width: "32px", height: "32px" }} />}
          label2=""
          value2=""
          currentStats={currentStats}
          labelColor={textColors.statsLabels}
          valueColor={textColors.statsValues}
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
          <Trophy size={28} color={textColors.biggestWinValue} />
          <div style={{ overflow: "hidden", width: "calc(100% - 38px)" }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: textColors.biggestWinLabel,
              }}
            >
              {biggestWinSlot ? capitalizeWords(biggestWinSlot.name) : "-"}
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: textColors.biggestWinValue }}>
              {biggestWin ? biggestWin.toFixed(2) : "-"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "48%" }}>
          <Skull size={28} color={textColors.biggestMultiValue} />
          <div style={{ overflow: "hidden", width: "calc(100% - 38px)" }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: textColors.biggestMultiLabel,
              }}
            >
              {biggestMultiSlot ? capitalizeWords(biggestMultiSlot.name) : "-"}
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: textColors.biggestMultiValue }}>
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
          color: textColors.tableHeaders,
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
                    background: index % 2 === 0 ? colors.tableEven : colors.tableOdd,
                  }}
                >
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      fontFamily: fontFamily,
                      width: "60%",
                      color: textColors.tableContent,
                    }}
                  >
                    {(index % slots.length) + 1}. {capitalizeWords(slot.name)}
                  </td>
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      fontFamily: fontFamily,
                      width: "10%",
                      textAlign: "right",
                      color: textColors.tableContent,
                    }}
                  >
                    {slot.bet.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      fontFamily: fontFamily,
                      width: "20%",
                      textAlign: "right",
                      color: textColors.tableContent,
                    }}
                  >
                    {slot.win !== null ? slot.win.toFixed(2) : "xx"}
                  </td>
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      fontFamily: fontFamily,
                      width: "10%",
                      textAlign: "right",
                      color: textColors.tableContent,
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
          background: `linear-gradient(to top, ${colors.footerStart}, ${colors.footerEnd})`,
          padding: "10px 30px",
          fontSize: "20px",
          textAlign: "center",
          color: colors.fontColor,
        }}
      >
        {footerText}
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
  labelColor,
  valueColor,
}: {
  icon1: React.ReactNode
  label1: string
  value1: string | number
  icon2: React.ReactNode
  label2: string
  value2: string | number
  currentStats: number
  labelColor: string
  valueColor: string
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
          <div style={{ fontSize: "18px", fontWeight: "bold", color: labelColor }}>{label1}</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: valueColor }}>{value1}</div>
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
          <div style={{ fontSize: "18px", fontWeight: "bold", color: labelColor }}>{label2}</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: valueColor }}>{value2}</div>
        </div>
      </div>
    </div>
  )
}
