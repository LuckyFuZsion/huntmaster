"use client"

import { useState, useEffect } from "react"
import { Crown, Scale } from "lucide-react"
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

export default function OBSBrowserSource3() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)

  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "600px"

  const biggestWin = Math.max(...slots.map((slot) => (slot.win !== null ? Number(slot.win) : 0)))
  const biggestWinSlot = slots.find((slot) => slot.win !== null && Number(slot.win) === biggestWin)
  const biggestMulti = Math.max(...slots.map((slot) => (slot.win !== null ? Number(slot.win) / Number(slot.bet) : 0)))
  const biggestMultiSlot = slots.find(
    (slot) => slot.win !== null && Number(slot.win) / Number(slot.bet) === biggestMulti,
  )

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

  const totalWinAmount = slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0)
  const openedBonuses = slots.filter((slot) => slot.win !== null).length
  const remainingBonuses = slots.length - openedBonuses

  const bestWin = slots.reduce((best, slot) => {
    if (slot.win === null) return best
    return slot.win > best ? slot.win : best
  }, 0)

  const avgXWin =
    slots.reduce((sum, slot) => {
      if (slot.win === null) return sum
      return sum + Number(slot.win) / Number(slot.bet)
    }, 0) / (openedBonuses || 1)

  const remainingBalance = startBalance - (endBalance + totalWinAmount)
  const remainingBetSize = slots.reduce((sum, slot) => sum + (slot.win === null ? Number(slot.bet) : 0), 0)
  const reqAvg = remainingBetSize > 0 ? (remainingBalance / remainingBetSize).toFixed(2) : "0"

  const bestXWin = slots.reduce((best, slot) => {
    if (slot.win === null) return best
    const xWin = Number(slot.win) / Number(slot.bet)
    return xWin > best ? xWin : best
  }, 0)

  return (
    <div
      style={{
        width: "600px",
        height: size,
        background: "#1E1E1E",
        color: "#FFFFFF",
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica', sans-serif",
        borderRadius: "15px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#2C2C2C",
          padding: "15px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "28px", fontWeight: "bold" }}>BONUS OPENING</div>
      </div>

      {/* Stats Bar */}
      <div
        style={{
          background: "#001F3F",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "20px",
          fontWeight: "bold",
        }}
      >
        <div>OPENED {openedBonuses}</div>
        <div>TOTAL {slots.length}</div>
        <div>{remainingBonuses} REMAINING</div>
      </div>

      {/* Main Stats */}
      <div
        style={{
          padding: "15px 20px",
          background: "#242424",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        <div>
          <StatRow label="START" value={startBalance.toFixed(2)} />
          <StatRow label="BEST WIN" value={bestWin ? bestWin.toFixed(2) : "-"} />
          <StatRow label="RUN AVG" value={avgXWin ? `${Math.round(avgXWin)}X` : "-"} />
        </div>
        <div>
          <StatRow label="WINNINGS" value={totalWinAmount ? totalWinAmount.toFixed(2) : "-"} />
          <StatRow label="BEST X WIN" value={bestXWin ? `${Math.round(bestXWin)}X` : "-"} />
          <StatRow label="REQ AVG" value={`${Math.round(Number(reqAvg))}X`} />
        </div>
      </div>

      {/* Highlight Rows */}
      {slots
        .filter((slot) => slot.win !== null)
        .slice(0, 1)
        .map((slot, index) => (
          <div key={`highlight-${slot.id}`} style={{ background: "#5C5C40", padding: "10px 20px" }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Crown size={24} />
                <span style={{ fontSize: "22px", fontWeight: "bold" }}>
                  {biggestWinSlot ? capitalizeWords(biggestWinSlot.name) : "-"}
                </span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "bold" }}>{biggestWin ? biggestWin.toFixed(2) : "-"}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Scale size={24} />
                <span style={{ fontSize: "22px", fontWeight: "bold" }}>
                  {biggestMultiSlot ? capitalizeWords(biggestMultiSlot.name) : "-"}
                </span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "bold" }}>
                {biggestMulti ? `${Math.round(biggestMulti)}x` : "-"}
              </div>
            </div>
          </div>
        ))}

      {/* Slots List */}
      <div style={{ flex: 1, padding: "10px 20px", background: "#1E1E1E", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
          <thead style={{ position: "sticky", top: 0, background: "#1E1E1E", zIndex: 1 }}>
            <tr>
              <th style={{ textAlign: "left", padding: "6px", width: "10%", fontSize: "20px", fontWeight: "bold" }}>
                #
              </th>
              <th style={{ textAlign: "left", padding: "6px", width: "60%", fontSize: "20px", fontWeight: "bold" }}>
                Slot Name
              </th>
              <th style={{ textAlign: "right", padding: "6px", width: "15%", fontSize: "20px", fontWeight: "bold" }}>
                Bet
              </th>
              <th style={{ textAlign: "right", padding: "6px", width: "15%", fontSize: "20px", fontWeight: "bold" }}>
                Win
              </th>
            </tr>
          </thead>
        </table>
        <div style={{ height: "170px", overflow: "hidden", position: "relative" }}>
          <div
            style={{
              animation: slots.length > 0 ? `scroll ${(slots.length + 1) * 5}s linear infinite` : "none",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
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
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {slot.id === "creator" ? (
                      <td
                        colSpan={4}
                        style={{
                          padding: "3px",
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
                        <td style={{ padding: "6px", width: "10%", fontSize: "20px", fontWeight: "bold" }}>
                          {(index % (slots.length + 1)) + 1}
                        </td>
                        <td style={{ padding: "6px", width: "60%", fontSize: "20px", fontWeight: "bold" }}>
                          {capitalizeWords(slot.name)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "6px",
                            width: "15%",
                            fontSize: "20px",
                            fontWeight: "bold",
                          }}
                        >
                          {slot.bet.toFixed(2)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "6px",
                            width: "15%",
                            fontSize: "20px",
                            fontWeight: "bold",
                          }}
                        >
                          {slot.win !== null ? slot.win.toFixed(2) : "xx"}
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

function StatRow({ label, value, color = "#FFFFFF" }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "10px",
      }}
    >
      <div style={{ color: "#808080", fontSize: "18px", fontWeight: "bold" }}>{label}</div>
      <div style={{ color, fontSize: "20px", fontWeight: "bold" }}>{value}</div>
    </div>
  )
}
