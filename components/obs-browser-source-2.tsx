"use client"

import { useState, useEffect } from "react"
import { Trophy } from "lucide-react"
import { useSearchParams } from "next/navigation"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase()).replace(/'S\b/g, "'s") // Fix apostrophe + S at the end of words
}

export default function OBSBrowserSource2() {
  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "600px"
  const username = searchParams.get("user")

  const [slots, setSlots] = useState<Slot[]>([])
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)
  const [colourTheme, setColourTheme] = useState("blue")
  const [selectedFont, setSelectedFont] = useState("Arial")
  const [fontSize, setFontSize] = useState(24)

  useEffect(() => {
    const loadSlotsFromFirestore = async () => {
      try {
        // If username is provided in URL, load that user's slots
        if (username) {
          const response = await fetch(`/api/slots/by-username?username=${username}`)
          const data = await response.json()
          if (data.success && data.slots) {
            setSlots(data.slots.map((slot: any) => ({
              id: slot.id,
              name: slot.name,
              bet: slot.bet,
              win: slot.win,
            })))
          }
        } else {
          // Fallback to session-based loading
          const session = localStorage.getItem("huntmaster_session")
          if (session) {
            const response = await fetch("/api/slots", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ session, action: "get" }),
            })
            const data = await response.json()
            if (data.success && data.slots) {
              setSlots(data.slots.map((slot: any) => ({
                id: slot.id,
                name: slot.name,
                bet: slot.bet,
                win: slot.win,
              })))
            }
          }
        }
      } catch (error) {
        console.error("Error loading slots:", error)
      }
    }

    const loadUserSettings = async () => {
      try {
        if (username) {
          // Load settings by username (for OBS browser sources)
          const response = await fetch(`/api/user-settings/by-username?username=${username}`)
          const data = await response.json()
          if (data.success && data.settings) {
            setStartBalance(Number.parseFloat(data.settings.startBalance) || 0)
            setEndBalance(Number.parseFloat(data.settings.endBalance) || 0)
            if (data.settings.colourTheme) setColourTheme(data.settings.colourTheme)
            if (data.settings.selectedFont) setSelectedFont(data.settings.selectedFont)
            if (data.settings.fontSize) setFontSize(Number.parseInt(data.settings.fontSize))
          }
        } else {
          // Fallback to session-based loading
          const session = localStorage.getItem("huntmaster_session")
          if (session) {
            const response = await fetch("/api/user-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, action: "get" }) })
            const data = await response.json()
            if (data.success && data.settings) {
              setStartBalance(Number.parseFloat(data.settings.startBalance) || 0)
              setEndBalance(Number.parseFloat(data.settings.endBalance) || 0)
              if (data.settings.colourTheme) setColourTheme(data.settings.colourTheme)
              if (data.settings.selectedFont) setSelectedFont(data.settings.selectedFont)
              if (data.settings.fontSize) setFontSize(Number.parseInt(data.settings.fontSize))
            }
          } else {
            // Ultimate fallback to localStorage
            const storedStartBalance = localStorage.getItem("startBalance")
            if (storedStartBalance) {
              setStartBalance(Number.parseFloat(storedStartBalance))
            }
            const storedEndBalance = localStorage.getItem("endBalance")
            if (storedEndBalance) {
              setEndBalance(Number.parseFloat(storedEndBalance))
            }
            const storedColourTheme = localStorage.getItem("colourTheme")
            if (storedColourTheme) {
              setColourTheme(storedColourTheme)
            }
            const storedFont = localStorage.getItem("selectedFont")
            if (storedFont) {
              setSelectedFont(storedFont)
            }
            const storedFontSize = localStorage.getItem("fontSize")
            if (storedFontSize) {
              setFontSize(Number.parseInt(storedFontSize))
            }
          }
        }
      } catch (error) {
        console.error("Error loading user settings:", error)
      }
    }
    
    const loadData = async () => {
      await loadSlotsFromFirestore()
      await loadUserSettings()
    }

    loadData()
    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [username])

  const totalWinAmount = slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0)
  const totalBetAmount = slots.reduce((sum, slot) => sum + slot.bet, 0)
  const avgXWin = totalBetAmount > 0 ? (totalWinAmount / totalBetAmount).toFixed(2) : "0"
  const openedBonuses = slots.filter((slot) => slot.win !== null).length
  const biggestWin = Math.max(...slots.map((slot) => (slot.win !== null ? Number(slot.win) : 0)))
  const biggestWinSlot = slots.find((slot) => slot.win !== null && Number(slot.win) === biggestWin)
  const biggestMulti = Math.max(...slots.map((slot) => (slot.win !== null ? Number(slot.win) / Number(slot.bet) : 0)))
  const biggestMultiSlot = slots.find(
    (slot) => slot.win !== null && Number(slot.win) / Number(slot.bet) === biggestMulti,
  )

  const remainingBalance = startBalance - (endBalance + totalWinAmount)
  const remainingBetSize = slots.reduce((sum, slot) => sum + (slot.win === null ? Number(slot.bet) : 0), 0)
  const avgXReq = remainingBetSize > 0 ? (remainingBalance / remainingBetSize).toFixed(2) : "N/A"

  const creatorRow = { id: "creator", name: "Huntmaster - Created by LuckyFuZsion", bet: 0, win: null }
  const displaySlots = [...slots, creatorRow, ...slots, creatorRow]

  return (
    <div
      style={{
        width: "400px",
        height: size,
        background: "#1a1a1a",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        padding: "12px",
        fontSize: "16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
          borderBottom: "2px solid #333",
          paddingBottom: "8px",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "20px" }}>BONUSHUNT INFO</div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "12px",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        <div>{`${openedBonuses}/${slots.length}`}</div>
        <div>{`${((openedBonuses / slots.length) * 100).toFixed(0)}%`}</div>
      </div>
      <div
        style={{
          width: "100%",
          height: "6px",
          background: "#333",
          marginBottom: "16px",
          borderRadius: "3px",
        }}
      >
        <div
          style={{
            width: `${(openedBonuses / slots.length) * 100}%`,
            height: "100%",
            background: "#4a90e2",
            transition: "width 0.5s ease",
            borderRadius: "3px",
          }}
        />
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          marginBottom: "16px",
          background: "#222",
          padding: "12px",
          borderRadius: "8px",
        }}
      >
        <StatBox label="AVG X REQ" value={avgXReq} />
        <StatBox label="TARGET" value={(startBalance - endBalance).toFixed(2)} />
        <StatBox label="AVG X" value={Math.round(Number(avgXWin))} />
        <StatBox label="TOTAL WIN" value={totalWinAmount.toFixed(2)} />
      </div>

      {/* Best Wins */}
      <div
        style={{
          marginBottom: "16px",
          background: "#222",
          padding: "12px",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
          <Trophy size={24} color="#ffd700" />
          <span style={{ color: "#888", marginLeft: "8px", fontSize: "16px" }}>BEST WIN:</span>
          <span style={{ marginLeft: "8px", fontSize: "16px", fontWeight: "bold" }}>
            {biggestWinSlot ? `${capitalizeWords(biggestWinSlot.name)} (${biggestWin.toFixed(2)})` : "-"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Trophy size={24} color="#ffd700" />
          <span style={{ color: "#888", marginLeft: "8px", fontSize: "16px" }}>BEST MULTI:</span>
          <span style={{ marginLeft: "8px", fontSize: "16px", fontWeight: "bold" }}>
            {biggestMultiSlot ? `${capitalizeWords(biggestMultiSlot.name)} (${Math.round(biggestMulti)}x)` : "-"}
          </span>
        </div>
      </div>

      {/* Slots Table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead style={{ position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1 }}>
            <tr style={{ color: "#888" }}>
              <th style={{ textAlign: "left", padding: "8px", width: "5%" }}>#</th>
              <th style={{ textAlign: "left", padding: "8px", width: "45%" }}>SLOT</th>
              <th style={{ textAlign: "right", padding: "8px", width: "15%" }}>BET</th>
              <th style={{ textAlign: "right", padding: "8px", width: "20%" }}>WIN</th>
              <th style={{ textAlign: "right", padding: "8px", width: "15%" }}>MULTI</th>
            </tr>
          </thead>
        </table>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div
            style={{
              animation: `scroll ${Math.max(slots.length, 2) * 5}s linear infinite`,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <tbody>
                {[...displaySlots, ...displaySlots].map((slot, index) => (
                  <tr
                    key={`${slot.id}-${index}`}
                    style={{
                      background: index % 2 === 0 ? "#222" : "#1a1a1a",
                    }}
                  >
                    {slot.id === "creator" ? (
                      <td
                        colSpan={5}
                        style={{ textAlign: "center", padding: "8px", color: "gold", fontWeight: "bold" }}
                      >
                        {slot.name}
                      </td>
                    ) : (
                      <>
                        <td style={{ padding: "8px", width: "5%" }}>{(index % (slots.length + 1)) + 1}</td>
                        <td style={{ padding: "8px", width: "45%" }}>{capitalizeWords(slot.name)}</td>
                        <td style={{ textAlign: "right", padding: "8px", width: "15%" }}>{slot.bet.toFixed(2)}</td>
                        <td style={{ textAlign: "right", padding: "8px", width: "20%" }}>
                          {slot.win !== null ? slot.win.toFixed(2) : "xx"}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px", width: "15%" }}>
                          {slot.win !== null ? Math.round(Number(slot.win) / Number(slot.bet)) : "-"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>
        {`
          @keyframes scroll {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
        `}
      </style>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ color: "#888", fontSize: "14px", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: "bold" }}>{value}</div>
    </div>
  )
}
