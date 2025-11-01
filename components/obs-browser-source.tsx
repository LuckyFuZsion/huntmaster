"use client"

import { useState, useEffect } from "react"
import React from "react"
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

export default function OBSBrowserSource() {
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)
  const [colourTheme, setColourTheme] = useState("blue")
  const [selectedFont, setSelectedFont] = useState("Arial")
  const [fontSize, setFontSize] = useState(24)
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "600px"
  const username = searchParams.get("user") // Get username from URL parameter

  // Use real-time subscriptions instead of polling
  // Only subscribe to one source at a time based on whether username is provided
  const slotsByUsername = useSupabaseSlotsByUsername(username || null)
  const slotsByUserId = useSupabaseSlots(username ? null : userId)
  const settingsByUsername = useSupabaseUserSettingsByUsername(username || null)
  const settingsByUserId = useSupabaseUserSettings(username ? null : userId)

  // Determine which data to use
  const slotsData = username ? slotsByUsername : slotsByUserId
  const settingsData = username ? settingsByUsername : settingsByUserId
  const slots: Slot[] = (slotsData?.slots || []).map((slot: any) => ({
    id: slot.id,
    name: slot.name,
    bet: slot.bet,
    win: slot.win,
  })).filter((slot, index, self) => 
    // Additional deduplication safeguard: keep only first occurrence of each ID or name
    index === self.findIndex((s) => s.id === slot.id || s.name.toLowerCase().trim() === slot.name.toLowerCase().trim())
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Extract userId from session if no username provided
  useEffect(() => {
    if (!username) {
      const session = localStorage.getItem("huntmaster_session")
      if (session) {
        try {
          const sessionData = JSON.parse(decrypt(session))
          setUserId(sessionData.userId || null)
        } catch (error) {
          console.error("Error parsing session:", error)
          setUserId(null)
        }
      } else {
        setUserId(null)
      }
    }
  }, [username])

  // Update state from real-time settings
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
      if (s.colourTheme) setColourTheme(s.colourTheme)
      if (s.selectedFont) setSelectedFont(s.selectedFont)
      if (s.fontSize) setFontSize(Number.parseInt(String(s.fontSize)))
    }
  }, [settingsData?.settings])

  const totalBet = slots.reduce((sum, slot) => sum + Number.parseFloat(slot.bet.toString()), 0)
  const totalWinAmount = slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0)
  const totalBetAmount = slots.reduce(
    (sum, slot) => sum + (slot.win !== null ? Number.parseFloat(slot.bet.toString()) : 0),
    0,
  )
  const avgXWin = totalBetAmount > 0 ? (totalWinAmount / totalBetAmount).toFixed(2) : "0"
  const usedBalance = startBalance - endBalance
  const remaining = usedBalance - totalWinAmount
  const isProfit = remaining <= 0
  const profitAmount = isProfit ? Math.abs(remaining) : 0
  const openedBonuses = slots.filter((slot) => slot.win !== null).length
  const biggestWin = Math.max(...slots.map((slot) => (slot.win !== null ? slot.win : 0)))
  const biggestWinSlot = slots.find((slot) => slot.win !== null && slot.win === biggestWin)

  const remainingBalance = startBalance - (endBalance + totalWinAmount)
  const remainingBetSize = slots.reduce(
    (sum, slot) => sum + (slot.win === null ? Number.parseFloat(slot.bet.toString()) : 0),
    0,
  )
  const avgXReq = isProfit ? "Profit" : remainingBetSize > 0 ? (remainingBalance / remainingBetSize).toFixed(2) : "0"

  const scrollKeyframes = `
@keyframes scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
`

  const getBackgroundColour = () => {
    switch (colourTheme) {
      case "red":
        return "linear-gradient(145deg, #8B0000, #FF0000)"
      case "green":
        return "linear-gradient(145deg, #006400, #00FF00)"
      case "purple":
        return "linear-gradient(145deg, #4B0082, #8A2BE2)"
      case "orange":
        return "linear-gradient(145deg, #FF4500, #FFA500)"
      case "black":
        return "linear-gradient(145deg, #000000, #333333)"
      default: // blue
        return "linear-gradient(145deg, #000428, #004e92)"
    }
  }

  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase()).replace(/'S\b/g, "'s") // Fix apostrophe + S at the end of words
  }

  if (!mounted) {
    return null
  }

  return (
    <>
      <style suppressHydrationWarning>
        {scrollKeyframes}
        {`.scrolling-table > div {
          display: flex;
          flex-direction: column;
        }`}
      </style>
      <div
        style={{
          width: "600px",
          height: size,
          fontFamily: selectedFont,
          color: "white",
          background: "transparent",
          padding: "10px",
          marginTop: "-20px",
          display: "flex",
          flexDirection: "column",
        }}
        suppressHydrationWarning
      >
        <img
          src="https://i.ibb.co/vXBPN63/Huntmaster.png"
          alt="Huntmaster"
          style={{
            width: "500px",
            margin: "0 auto 10px",
            display: "block",
            filter: "drop-shadow(0 0 20px rgba(255,255,255,0.3))",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "4px",
            padding: "10px",
            background: getBackgroundColour(),
            borderRadius: "6px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
            marginBottom: "0px",
          }}
        >
          <StatBox label="Start Bal" value={startBalance.toFixed(2)} fontSize={fontSize} />
          <StatBox label="End Bal" value={endBalance.toFixed(2)} fontSize={fontSize} />
          <StatBox label="Used Bal" value={usedBalance.toFixed(2)} fontSize={fontSize} />
          <StatBox label="Total Win" value={totalWinAmount.toFixed(2)} fontSize={fontSize} />
          <StatBox label="Avg X Req" value={isProfit ? "Profit" : avgXReq} fontSize={fontSize} />
          <StatBox
            label="Remaining"
            value={isProfit ? `Profit: ${profitAmount.toFixed(2)}` : Math.abs(remaining).toFixed(2)}
            fontSize={fontSize}
          />
          <StatBox label="Collected" value={slots.length.toString()} fontSize={fontSize} />
          <StatBox label="Opened" value={openedBonuses.toString()} fontSize={fontSize} />
          <StatBox label="Avg X Win" value={avgXWin} fontSize={fontSize} />
          <div style={{ gridColumn: "span 3", textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: `${fontSize}px`, color: "#FFFFFF" }}>
              Biggest Win: {biggestWinSlot ? `${capitalizeWords(biggestWinSlot.name)}: ${biggestWin.toFixed(2)}` : "-"}
            </div>
          </div>
          <div
            style={{
              gridColumn: "span 3",
              width: "95%",
              height: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              overflow: "hidden",
              margin: "4px auto 0",
            }}
          >
            <div
              style={{
                width: `${(openedBonuses / slots.length) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #00BFFF, #87CEEB)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "0" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              color: "white",
              fontSize: `${fontSize - 2}px`,
              borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "5px", width: "5%" }}>#</th>
                <th style={{ textAlign: "left", padding: "5px", width: "45%" }}>Slot Name</th>
                <th style={{ textAlign: "left", padding: "5px", width: "15%" }}>Bet</th>
                <th style={{ textAlign: "left", padding: "5px", width: "20%" }}>Win</th>
                <th style={{ textAlign: "left", padding: "5px", width: "15%" }}>X Win</th>
              </tr>
            </thead>
          </table>
        </div>

        <div
          className="scrolling-table"
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            paddingTop: "0",
            width: "100%",
          }}
        >
          <div
            style={{
              animation: slots.length > 0 ? `scroll ${slots.length * 7.5}s linear infinite` : "none",
            }}
          >
            {/* First set of slots */}
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                color: "white",
                fontSize: `${fontSize - 2}px`,
                fontFamily: "'Verdana', sans-serif",
                fontWeight: "bold",
              }}
            >
              <tbody>
                {slots.map((slot, index) => (
                  <React.Fragment key={`${slot.id}-${index}`}>
                    <tr>
                      <td style={{ textAlign: "left", padding: "5px", width: "5%" }}>{index + 1}</td>
                      <td style={{ textAlign: "left", padding: "5px", width: "45%" }}>{capitalizeWords(slot.name)}</td>
                      <td style={{ textAlign: "left", padding: "5px", width: "15%" }}>
                        {Number.parseFloat(slot.bet.toString()).toFixed(2)}
                      </td>
                      <td style={{ textAlign: "left", padding: "5px", width: "20%" }}>
                        {slot.win !== null ? slot.win.toFixed(2) : "xx"}
                      </td>
                      <td style={{ textAlign: "left", padding: "5px", width: "15%" }}>
                        {slot.win !== null ? (slot.win / slot.bet).toFixed(2) : "-"}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "5px", color: "gold" }}>
                    Created by LuckyFuZsion
                  </td>
                </tr>
              </tbody>
            </table>
            {/* Duplicate the content for seamless looping */}
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0",
                color: "white",
                fontSize: `${fontSize - 2}px`,
                fontFamily: "'Verdana', sans-serif",
                fontWeight: "bold",
              }}
            >
              <tbody>
                {slots.map((slot, index) => (
                  <React.Fragment key={`${slot.id}-repeat-${index}`}>
                    <tr>
                      <td style={{ textAlign: "left", padding: "5px", width: "5%" }}>{index + 1}</td>
                      <td style={{ textAlign: "left", padding: "5px", width: "45%" }}>{capitalizeWords(slot.name)}</td>
                      <td style={{ textAlign: "left", padding: "5px", width: "15%" }}>
                        {Number.parseFloat(slot.bet.toString()).toFixed(2)}
                      </td>
                      <td style={{ textAlign: "left", padding: "5px", width: "20%" }}>
                        {slot.win !== null ? slot.win.toFixed(2) : "xx"}
                      </td>
                      <td style={{ textAlign: "left", padding: "5px", width: "15%" }}>
                        {slot.win !== null ? (slot.win / slot.bet).toFixed(2) : "-"}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "5px", color: "gold" }}>
                    Created by LuckyFuZsion
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function StatBox({ label, value, fontSize }: { label: string; value: string; fontSize: number }) {
  const isProfit = label === "Remaining" && value.startsWith("Profit:")
  return (
    <div
      style={{
        background: "linear-gradient(145deg, #000428, #00204d)",
        padding: "2px",
        borderRadius: "6px",
        textAlign: "center",
        height: "60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: `${fontSize}px`, marginBottom: "2px", opacity: 0.9 }}>{label}</div>
      <div style={{ fontSize: `${fontSize}px`, fontWeight: "bold", color: isProfit ? "gold" : "inherit" }}>{value}</div>
    </div>
  )
}
