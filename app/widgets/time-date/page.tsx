"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function TimeDateWidgetContent() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const searchParams = useSearchParams()
  const format = searchParams.get("format") || "12" // 12 or 24 hour format
  const showSeconds = searchParams.get("seconds") !== "false" // Show seconds by default

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format time based on preference
  const formatTime = () => {
    let hours = currentTime.getHours()
    const minutes = currentTime.getMinutes().toString().padStart(2, "0")
    const seconds = currentTime.getSeconds().toString().padStart(2, "0")

    let period = ""
    if (format === "12") {
      period = hours >= 12 ? " PM" : " AM"
      hours = hours % 12 || 12
    }

    return `${hours}:${minutes}${showSeconds ? `:${seconds}` : ""}${period}`
  }

  // Format date
  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return currentTime.toLocaleDateString(undefined, options)
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="relative p-6 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full opacity-10"
                style={{
                  width: `${Math.random() * 100 + 50}px`,
                  height: `${Math.random() * 100 + 50}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)",
                  animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Time and date display */}
        <div className="relative z-10 text-center">
          <div
            className="text-7xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            style={{ textShadow: "0 0 10px rgba(0, 0, 0, 0.5)" }}
          >
            {formatTime()}
          </div>
          <div
            className="text-2xl font-medium text-white/90 mt-2 tracking-wide drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
            style={{ textShadow: "0 0 8px rgba(0, 0, 0, 0.5)" }}
          >
            {formatDate()}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.1;
          }
          50% {
            transform: translateY(-20px) translateX(10px) scale(1.1);
            opacity: 0.2;
          }
          100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.1;
          }
        }
      `}</style>
    </div>
  )
}

export default function TimeDateWidget() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="relative p-6 overflow-hidden">
          <div className="relative z-10 text-center">
            <div className="text-7xl font-bold text-white tracking-tight">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <TimeDateWidgetContent />
    </Suspense>
  )
}
