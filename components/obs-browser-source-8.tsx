"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseSlotsByUsername } from "@/lib/hooks/useSupabaseSlotsByUsername"
import { useSupabaseSlots } from "@/lib/hooks/useSupabaseSlots"
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

export default function OBSBrowserSource8() {
  const searchParams = useSearchParams()
  const size = searchParams.get("size") || "600px"
  const username = searchParams.get("user")
  const [userId, setUserId] = useState<string | null>(null)

  // Use real-time subscriptions
  const slotsByUsername = useSupabaseSlotsByUsername(username || null)
  const slotsByUserId = useSupabaseSlots(username ? null : userId)

  const slotsData = username ? slotsByUsername : slotsByUserId

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

  return (
    <div
      style={{
        width: "700px",
        height: size,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Static Menu */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: "linear-gradient(90deg, #4a00e0, #8e2de2)",
          fontSize: "22px",
          fontWeight: "bold",
          borderBottom: "4px solid #8e2de2",
        }}
      >
        <div style={{ width: "65%", paddingLeft: "16px", textAlign: "left" }}>SLOT</div>
        <div style={{ width: "10%", paddingRight: "16px", textAlign: "right" }}>BET</div>
        <div style={{ width: "15%", paddingRight: "16px", textAlign: "right" }}>WIN</div>
        <div style={{ width: "10%", paddingRight: "16px", textAlign: "right" }}>X</div>
      </div>

      {/* Scrolling Slot List */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", background: "rgba(0,0,0,0.3)" }}>
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
                      fontSize: "24px", // Reduced from 28px
                      fontWeight: "bold",
                      fontFamily: "'Arial', sans-serif",
                      width: "65%", // Increased from 60%
                      textAlign: "left",
                    }}
                  >
                    {(index % slots.length) + 1}. {capitalizeWords(slot.name)}
                  </td>
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "24px", // Reduced from 28px
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
                      fontSize: "24px", // Reduced from 28px
                      fontWeight: "bold",
                      fontFamily: "'Arial', sans-serif",
                      width: "15%", // Decreased from 20%
                      textAlign: "right",
                    }}
                  >
                    {slot.win !== null ? slot.win.toFixed(2) : "xx"}
                  </td>
                  <td
                    style={{
                      padding: "8px 16px",
                      fontSize: "24px", // Reduced from 28px
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
