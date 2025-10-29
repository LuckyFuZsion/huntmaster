"use client"

import { useState, useEffect } from "react"
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

export default function OBSBrowserSource6() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [startBalance, setStartBalance] = useState(0)
  const [endBalance, setEndBalance] = useState(0)
  const [currentStatPage, setCurrentStatPage] = useState(0)
  const [showBigWin, setShowBigWin] = useState(false)

  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "600px"
  const username = searchParams.get("user")

  useEffect(() => {
    const loadSlotsFromFirestore = async () => {
      try {
        if (username) {
          const response = await fetch(`/api/slots/by-username?username=${username}`)
          const data = await response.json()
          if (data.success && data.slots) {
            setSlots(data.slots.map((slot: any) => ({ id: slot.id, name: slot.name, bet: slot.bet, win: slot.win })))
          }
        } else {
          const session = localStorage.getItem("huntmaster_session")
          if (session) {
            const response = await fetch("/api/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, action: "get" }) })
            const data = await response.json()
            if (data.success && data.slots) {
              setSlots(data.slots.map((slot: any) => ({ id: slot.id, name: slot.name, bet: slot.bet, win: slot.win })))
            }
          }
        }
      } catch (error) {
        console.error("Error loading slots:", error)
      }
    }
    
    const loadData = async () => {
      await loadSlotsFromFirestore()
      const session = localStorage.getItem("huntmaster_session")
      if (session) {
        try {
          const response = await fetch("/api/user-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, action: "get" }) })
          const data = await response.json()
          if (data.success && data.settings) {
            setStartBalance(Number.parseFloat(data.settings.startBalance) || 0)
            setEndBalance(Number.parseFloat(data.settings.endBalance) || 0)
          }
        } catch (error) {
          console.error("Error loading user settings:", error)
        }
      }
    }

    loadData()
    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [username])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatPage((prev) => (prev + 1) % 2)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setShowBigWin((prev) => !prev)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const totalWinAmount = slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0)
  const openedBonuses = slots.filter((slot) => slot.win !== null).length
  const avgXWin =
    openedBonuses > 0
      ? slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) / Number(slot.bet) : 0), 0) /
        openedBonuses
      : 0
  const biggestWin = Math.max(...slots.map((slot) => (slot.win !== null ? Number(slot.win) : 0)))
  const biggestWinSlot = slots.find((slot) => slot.win !== null && Number(slot.win) === biggestWin)

  const remainingBalance = startBalance - endBalance
  const remainingBetSize = slots.reduce((sum, slot) => sum + (slot.win === null ? Number(slot.bet) : 0), 0)

  return (
    <div
      style={{
        width: "800px",
        height: size,
        background: "#1a1a1a",
        fontFamily: "'Comic Sans MS', cursive",
        position: "relative",
        overflow: "hidden",
        padding: "20px",
      }}
    >
      {/* Comic-style Grid Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gridTemplateRows: "auto 1fr",
          gap: "20px",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Title Panel */}
        <div
          style={{
            gridColumn: "1 / -1",
            background: "linear-gradient(45deg, #FF6B6B, #FFD93D)",
            borderRadius: "15px",
            padding: "20px",
            position: "relative",
            border: "4px solid black",
            overflow: "hidden",
          }}
        >
          {/* Halftone Pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)",
              backgroundSize: "8px 8px",
              opacity: 0.1,
            }}
          />
          {/* Starburst Effect */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.2) 100%)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: "40px",
                fontWeight: "bold",
                color: "black",
                textShadow: "2px 2px 0 white, -2px -2px 0 white, 2px -2px 0 white, -2px 2px 0 white",
              }}
            >
              BONUS HUNT!
            </div>
            <div
              style={{
                background: "white",
                padding: "10px 20px",
                borderRadius: "50px",
                border: "3px solid black",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#FF6B6B",
              }}
            >
              {openedBonuses}/{slots.length}
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div
          style={{
            background: "#4ECDC4",
            borderRadius: "15px",
            padding: "10px",
            border: "4px solid black",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gridRow: "2", // Add this to ensure it takes up the same grid row as slots list
            height: "100%", // Change from calc to 100%
          }}
        >
          {/* Halftone Pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)",
              backgroundSize: "8px 8px",
              opacity: 0.1,
            }}
          />
          <div
            style={{
              position: "relative",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {[
              [
                { label: "START BAL", value: startBalance.toFixed(2) },
                { label: "END BAL", value: endBalance.toFixed(2) },
                { label: "USED BAL", value: (startBalance - endBalance).toFixed(2) },
                { label: "TOTAL WIN", value: totalWinAmount.toFixed(2) },
              ],
              [
                { label: "COLLECTED", value: slots.length.toString() },
                { label: "OPENED", value: openedBonuses.toString() },
                { label: "AVG X WIN", value: `${Math.round(avgXWin)}x` },
                {
                  label: "REQ X",
                  value: `${Math.round(remainingBetSize > 0 ? remainingBalance / remainingBetSize : 0)}x`,
                },
              ],
            ].map((page, pageIndex) => (
              <div
                key={pageIndex}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  transition: "transform 0.5s ease, opacity 0.5s ease",
                  transform: `translateY(${(pageIndex - currentStatPage) * 100}%)`,
                  opacity: pageIndex === currentStatPage ? 1 : 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "4px",
                }}
              >
                {page.map((stat, index) => (
                  <div
                    key={index}
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "10px",
                      border: "3px solid black",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      flex: 1,
                      minHeight: "0",
                    }}
                  >
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "#666" }}>{stat.label}</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FF6B6B" }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Slots List Panel */}
        <div
          style={{
            background: "#6C5CE7",
            borderRadius: "15px",
            padding: "20px",
            border: "4px solid black",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Halftone Pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)",
              backgroundSize: "8px 8px",
              opacity: 0.1,
            }}
          />
          <div style={{ height: "100%", overflow: "hidden", position: "relative" }}>
            <div
              style={{
                animation: slots.length > 0 ? `scroll ${Math.max(slots.length * 10, 20)}s linear infinite` : "none",
              }}
            >
              {[...slots, ...slots].map((slot, index) => (
                <div
                  key={`${slot.id}-${index}`}
                  style={{
                    background: "white",
                    padding: "10px",
                    marginBottom: "10px",
                    borderRadius: "10px",
                    border: "3px solid black",
                    display: "grid",
                    gridTemplateColumns: "30px 1fr auto auto auto",
                    gap: "15px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#666" }}>
                    {(index % slots.length) + 1}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "black" }}>
                    {capitalizeWords(slot.name)}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#4ECDC4" }}>{slot.bet.toFixed(2)}</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#FF6B6B" }}>
                    {slot.win !== null ? slot.win.toFixed(2) : "??"}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#6C5CE7" }}>
                    {slot.win !== null ? `${Math.round(Number(slot.win) / Number(slot.bet))}x` : "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Big Win Panel */}
        {showBigWin && biggestWinSlot && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-5deg)",
              background: "#FFD93D",
              padding: "30px",
              borderRadius: "20px",
              border: "4px solid black",
              boxShadow: "10px 10px 0 rgba(0,0,0,0.2)",
              animation: "bounce 0.5s ease-in-out",
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: "black",
                textAlign: "center",
                textShadow: "2px 2px 0 white",
              }}
            >
              BANG!
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#FF6B6B",
                textAlign: "center",
                marginTop: "10px",
              }}
            >
              {capitalizeWords(biggestWinSlot.name)}
            </div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "black",
                textAlign: "center",
                marginTop: "5px",
              }}
            >
              {biggestWin.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes scroll {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }

          @keyframes bounce {
            0% { transform: translate(-50%, -50%) scale(0) rotate(-5deg); }
            50% { transform: translate(-50%, -50%) scale(1.2) rotate(-5deg); }
            100% { transform: translate(-50%, -50%) scale(1) rotate(-5deg); }
          }
        `}
      </style>
    </div>
  )
}
