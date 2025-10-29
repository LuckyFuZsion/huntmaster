"use client"

import { useState, useEffect, Suspense } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

function StartBalanceWidgetContent() {
  const [startBalance, setStartBalance] = useState("0")
  const [endBalance, setEndBalance] = useState("0")
  const [slots, setSlots] = useState<Slot[]>([])
  const [currentStatIndex, setCurrentStatIndex] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const searchParams = useSearchParams()
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
            setStartBalance(data.settings.startBalance || "0")
            setEndBalance(data.settings.endBalance || "0")
          }
        } catch (error) {
          console.error("Error loading user settings:", error)
        }
      }

      if (!isLoaded) setIsLoaded(true)
    }

    loadData()
    const dataInterval = setInterval(loadData, 2000)

    // Rotate stats every 4 seconds
    const rotationInterval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % 6) // Updated to include logo
    }, 4000)

    return () => {
      clearInterval(dataInterval)
      clearInterval(rotationInterval)
    }
  }, [username, isLoaded])

  const calculateStats = () => {
    const usedBalance = Number(startBalance) - Number(endBalance)
    const totalWinAmount = slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0)
    const remainingBalance = Number(startBalance) - (Number(endBalance) + totalWinAmount)
    const remainingBetSize = slots.reduce((sum, slot) => sum + (slot.win === null ? Number(slot.bet) : 0), 0)
    const avgXReq = remainingBetSize > 0 ? (remainingBalance / remainingBetSize).toFixed(1) : "0"

    // Check if any bonuses have been opened
    const anyBonusesOpened = slots.some((slot) => slot.win !== null)
    const nextBonus = slots.find((slot) => slot.win === null)

    const biggestWin = Math.max(...slots.map((slot) => (slot.win !== null ? Number(slot.win) : 0)))
    const biggestWinSlot = slots.find((slot) => slot.win !== null && Number(slot.win) === biggestWin)

    return {
      usedBalance,
      avgXReq,
      nextBonus: !anyBonusesOpened ? "Still Hunting" : nextBonus?.name || "All Opened",
      biggestWin: biggestWinSlot ? biggestWin : 0,
    }
  }

  const stats = calculateStats()

  const getCurrentStat = () => {
    switch (currentStatIndex) {
      case 0:
        return {
          label: "START BALANCE",
          value: Number(startBalance).toLocaleString("en-US", { maximumFractionDigits: 0 }),
          type: "text",
        }
      case 1:
        return {
          label: "USED BALANCE",
          value: stats.usedBalance.toLocaleString("en-US", { maximumFractionDigits: 0 }),
          type: "text",
        }
      case 2:
        return {
          label: "NEXT BONUS",
          value: stats.nextBonus,
          type: "text",
        }
      case 3:
        return {
          label: "AVG X REQ",
          value: `${stats.avgXReq}x`,
          type: "text",
        }
      case 4:
        return {
          label: "BIGGEST WIN",
          value: stats.biggestWin.toLocaleString("en-US", { maximumFractionDigits: 0 }),
          type: "text",
        }
      case 5:
        return {
          type: "image",
          imageUrl:
            "https://gxciioabwrkahdfe.public.blob.vercel-storage.com/logos/gamba-vYautTpnJ4JFptzvmX3by6vnsboXVj.png",
        }
      default:
        return { label: "", value: "", type: "text" }
    }
  }

  const currentStat = getCurrentStat()

  return (
    <div
      className="relative w-[300px] h-[120px] rounded-[24px] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #2D1B4C 0%, #6B1B4C 100%)",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
      }}
    >
      {/* Animated background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(45deg, rgba(66, 211, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)",
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-4">
        {currentStat.type === "image" ? (
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{
              transition: "opacity 0.5s ease-in-out",
              animation: "fadeInOut 4s ease-in-out",
            }}
          >
            <Image
              src={currentStat.imageUrl || "/placeholder.svg"}
              alt="Logo"
              fill
              style={{
                objectFit: "cover",
                padding: "2px",
              }}
              priority
            />
          </div>
        ) : (
          <>
            <div
              className="text-white/80 text-xl mb-1 font-medium tracking-wide text-center"
              style={{
                transition: "opacity 0.5s ease-in-out",
                animation: "fadeInOut 4s ease-in-out",
              }}
            >
              {currentStat.label}
            </div>
            <div
              className="text-4xl font-bold text-white text-center break-words w-full"
              style={{
                transition: "opacity 0.5s ease-in-out",
                animation: "fadeInOut 4s ease-in-out",
                fontSize: currentStat.label === "NEXT BONUS" ? "2rem" : "2.5rem",
              }}
            >
              {isLoaded ? currentStat.value : "Loading..."}
            </div>
          </>
        )}
      </div>

      {/* Animated border */}
      <div
        className="absolute inset-0 border-2 border-transparent rounded-[24px]"
        style={{
          background: "linear-gradient(90deg, #00f2fe 0%, #4facfe 100%) border-box",
          WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "destination-out",
          maskComposite: "exclude",
          boxShadow: "0 0 15px rgba(0, 242, 254, 0.5)",
        }}
      />

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes fadeInOut {
          0%, 100% {
            opacity: 0;
          }
          10%, 90% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default function StartBalanceWidget() {
  return (
    <Suspense fallback={
      <div className="relative w-[300px] h-[120px] rounded-[24px] overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1B4C 0%, #6B1B4C 100%)", boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)" }}>
        <div className="relative h-full flex flex-col items-center justify-center p-4">
          <div className="text-white/80 text-xl mb-1 font-medium tracking-wide text-center">Loading...</div>
        </div>
      </div>
    }>
      <StartBalanceWidgetContent />
    </Suspense>
  )
}
