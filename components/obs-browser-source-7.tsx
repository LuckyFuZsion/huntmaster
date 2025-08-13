"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Trophy, Zap, Sparkles, Flame, Skull, DollarSign } from "lucide-react"
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

export default function OBSBrowserSource7() {
  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "600px"
  const borderRadius = searchParams.get("radius") || "20px"

  const [slots, setSlots] = useState<Slot[]>([])
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)
  const [currentStats, setCurrentStats] = useState(0)

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
      {/* Header - 30% of height */}
      <div
        style={{
          background: "linear-gradient(90deg, #4a00e0, #8e2de2)",
          padding: "0 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "3px solid #8e2de2",
          height: "30%",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: "bold", lineHeight: "1" }}>🎰 BONUS HUNT</div>
        <div style={{ fontSize: "20px", lineHeight: "1" }}>
          {openedBonuses}/{totalBonuses}
          <span style={{ marginLeft: "20px", color: "#ffd700" }}>
            {totalBonuses > 0 ? ((openedBonuses / totalBonuses) * 100).toFixed(0) : 0}%
          </span>
        </div>
      </div>

      {/* Stats Grid - 30% of height */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          padding: "10px 20px",
          background: "rgba(255,255,255,0.05)",
          height: "30%",
          alignItems: "center",
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

      {/* Highlight Rows - 30% of height */}
      <div
        style={{
          background: "rgba(0,0,0,0.2)",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          overflow: "hidden",
          height: "30%",
          alignItems: "center",
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

      {/* Footer - 10% of height */}
      <div
        style={{
          background: "linear-gradient(90deg, #4a00e0, #8e2de2)",
          padding: "0 30px",
          fontSize: "18px",
          textAlign: "center",
          lineHeight: "1",
          height: "10%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Huntmaster - Created by LuckyFuZsion
      </div>
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

