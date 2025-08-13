"use client"

import { useState, useEffect } from "react"
import { Trophy, Crown, Frown, Play } from "lucide-react"
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

export default function OBSBrowserSource4() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)

  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "300px"

  useEffect(() => {
    const loadData = () => {
      const storedSlots = localStorage.getItem("slotList")
      if (storedSlots) {
        setSlots(JSON.parse(storedSlots))
      }
      const storedStartBalance = localStorage.getItem("startBalance")
      if (storedStartBalance) {
        setStartBalance(Number.parseFloat(storedStartBalance))
      }
      const storedEndBalance = localStorage.getItem("endBalance")
      if (storedEndBalance) {
        setEndBalance(Number.parseFloat(storedEndBalance))
      }
    }

    loadData()
    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [])

  const openedBonuses = slots.filter((slot) => slot.win !== null).length
  const totalBonuses = slots.length

  // Calculate averages and best/worst wins
  const avgXWin =
    slots.reduce((sum, slot) => {
      if (slot.win === null) return sum
      return sum + Number(slot.win) / Number(slot.bet)
    }, 0) / (openedBonuses || 1)

  const remainingBalance =
    startBalance - (endBalance + slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0))
  const remainingBetSize = slots.reduce((sum, slot) => sum + (slot.win === null ? Number(slot.bet) : 0), 0)
  const reqAvg = remainingBetSize > 0 ? (remainingBalance / remainingBetSize).toFixed(2) : "0"

  const bestWin = slots.reduce(
    (best, slot) => {
      if (slot.win === null) return best
      return slot.win > best.win ? { name: slot.name, bet: slot.bet, win: slot.win } : best
    },
    { name: "", bet: 0, win: 0 },
  )

  const worstWin = slots.reduce(
    (worst, slot) => {
      if (slot.win === null) return worst
      if (worst.win === Number.POSITIVE_INFINITY) return { name: slot.name, bet: slot.bet, win: slot.win }
      return slot.win < worst.win ? { name: slot.name, bet: slot.bet, win: slot.win } : worst
    },
    { name: "", bet: 0, win: Number.POSITIVE_INFINITY },
  )

  return (
    <div
      style={{
        width: "520px",
        height: size,
        background: "linear-gradient(to bottom, #2c3e50, #1a1a2e)",
        color: "#FFFFFF",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        borderRadius: "15px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header Stats */}
      <div
        style={{
          padding: "10px 20px",
          height: "60px",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #555",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Play size={28} color="#8BB8E8" />
          <span style={{ fontSize: "20px", color: "#8BB8E8", fontWeight: "bold" }}>
            {openedBonuses} / {totalBonuses}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Trophy size={28} color="#8BB8E8" />
          <span style={{ fontSize: "20px", color: "#8BB8E8", fontWeight: "bold" }}>{Math.round(avgXWin)}x</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Trophy size={28} color="#8BB8E8" style={{ transform: "rotate(180deg)" }} />
          <span style={{ fontSize: "20px", color: "#8BB8E8", fontWeight: "bold" }}>{Math.round(Number(reqAvg))}x</span>
        </div>
      </div>

      {/* Slots List */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "#2a2a2a", zIndex: 1 }}>
            <tr>
              <th style={{ padding: "12px 15px", textAlign: "left", color: "#8BB8E8", width: "10%", fontSize: "18px" }}>
                #
              </th>
              <th style={{ padding: "12px 15px", textAlign: "left", color: "#8BB8E8", width: "50%", fontSize: "18px" }}>
                SLOT
              </th>
              <th
                style={{ padding: "12px 15px", textAlign: "right", color: "#8BB8E8", width: "15%", fontSize: "18px" }}
              >
                BET
              </th>
              <th
                style={{ padding: "12px 15px", textAlign: "right", color: "#8BB8E8", width: "15%", fontSize: "18px" }}
              >
                WIN
              </th>
              <th
                style={{ padding: "12px 15px", textAlign: "right", color: "#8BB8E8", width: "10%", fontSize: "18px" }}
              >
                X
              </th>
            </tr>
          </thead>
        </table>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div
            style={{
              animation: `scroll ${Math.max(slots.length, 2) * 5}s linear infinite`,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ...slots,
                  { id: "creator", name: "Huntmaster - Created by LuckyFuZsion", bet: 0, win: null },
                  ...slots,
                  { id: "creator", name: "Huntmaster - Created by LuckyFuZsion", bet: 0, win: null },
                ].map((slot, index) => (
                  <tr
                    key={`${slot.id}-${index}`}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {slot.id === "creator" ? (
                      <td
                        colSpan={5}
                        style={{
                          padding: "8px 15px",
                          textAlign: "center",
                          color: "gold",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        {slot.name}
                      </td>
                    ) : (
                      <>
                        <td
                          style={{
                            padding: "12px 15px",
                            color: "#FFFFFF",
                            width: "10%",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {(index % (slots.length + 1)) + 1}.
                        </td>
                        <td
                          style={{
                            padding: "12px 15px",
                            color: "#FFFFFF",
                            width: "50%",
                            whiteSpace: "normal",
                            wordWrap: "break-word",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {capitalizeWords(slot.name)}
                        </td>
                        <td
                          style={{
                            padding: "12px 15px",
                            textAlign: "right",
                            color: "#8BB8E8",
                            width: "15%",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {slot.bet.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "12px 15px",
                            textAlign: "right",
                            color: "#8BB8E8",
                            width: "15%",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {slot.win !== null ? slot.win.toFixed(2) : "xx"}
                        </td>
                        <td
                          style={{
                            padding: "12px 15px",
                            textAlign: "right",
                            color: "#8BB8E8",
                            width: "10%",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
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

      {/* Best and Worst Wins */}
      <div
        style={{
          padding: "10px 20px",
          background: "rgba(0,0,0,0.2)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Crown size={28} color="#ffd700" />
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>{capitalizeWords(bestWin.name)}</span>
          <span style={{ color: "#8BB8E8", fontSize: "18px", marginLeft: "5px", fontWeight: "bold" }}>
            {bestWin.win.toFixed(2)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Frown size={28} color="#ff6b6b" />
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>{capitalizeWords(worstWin.name)}</span>
          <span style={{ color: "#8BB8E8", fontSize: "18px", marginLeft: "5px", fontWeight: "bold" }}>
            {worstWin.win.toFixed(2)}
          </span>
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

