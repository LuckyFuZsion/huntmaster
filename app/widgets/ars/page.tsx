"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseUserSettingsByUsername } from "@/lib/hooks/useSupabaseUserSettingsByUsername"
import { useSupabaseUserSettings } from "@/lib/hooks/useSupabaseUserSettings"
import { decrypt } from "@/lib/protection"

// Exchange rate: 1 USD = 0.00094 ARS
const EXCHANGE_RATE = 0.00094

export default function ARSWidget() {
  const searchParams = useSearchParams()
  const username = searchParams.get("user")
  const [userId, setUserId] = useState<string | null>(null)
  const [startBalance, setStartBalance] = useState<string>("0")
  const [convertedAmount, setConvertedAmount] = useState<string>("0")
  const [isLoaded, setIsLoaded] = useState(false)

  // Use real-time subscriptions
  const settingsByUsername = useSupabaseUserSettingsByUsername(username || null)
  const settingsByUserId = useSupabaseUserSettings(username ? null : userId)

  const settingsData = username ? settingsByUsername : settingsByUserId

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
    if (settingsData?.settings?.startBalance) {
      const balance = settingsData.settings.startBalance
      setStartBalance(balance)
      
      // Convert the balance to ARS
      const balanceInUSD = Number.parseFloat(balance)
      const balanceInARS = balanceInUSD * EXCHANGE_RATE
      
      // Format to 2 decimal places
      setConvertedAmount(balanceInARS.toFixed(2))
      if (!isLoaded) setIsLoaded(true)
    } else if (!settingsData?.loading && !isLoaded) {
      setIsLoaded(true)
    }
  }, [settingsData?.settings, settingsData?.loading, isLoaded])

  return (
    <div className="relative w-[200px] h-[80px] flex items-center justify-center">
      {/* Animated background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 70%)",
          animation: "pulse 3s ease-in-out infinite",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="text-sm text-white/80 font-medium mb-1">ARS Conversion</div>
        <div className="text-3xl font-bold text-white flex items-baseline">
          <span className="text-white/90 mr-1">$</span>
          <span>{isLoaded ? convertedAmount : "Loading..."}</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  )
}
