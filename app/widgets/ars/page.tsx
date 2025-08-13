"use client"

import { useState, useEffect } from "react"

// Exchange rate: 1 USD = 0.00094 ARS
const EXCHANGE_RATE = 0.00094

export default function ARSWidget() {
  const [startBalance, setStartBalance] = useState<string>("0")
  const [convertedAmount, setConvertedAmount] = useState<string>("0")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadData = () => {
      const storedStartBalance = localStorage.getItem("startBalance")

      if (storedStartBalance) {
        setStartBalance(storedStartBalance)

        // Convert the balance to ARS
        const balanceInUSD = Number.parseFloat(storedStartBalance)
        const balanceInARS = balanceInUSD * EXCHANGE_RATE

        // Format to 2 decimal places
        setConvertedAmount(balanceInARS.toFixed(2))
      }

      if (!isLoaded) setIsLoaded(true)
    }

    loadData()
    const dataInterval = setInterval(loadData, 2000)

    return () => {
      clearInterval(dataInterval)
    }
  }, [isLoaded])

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
