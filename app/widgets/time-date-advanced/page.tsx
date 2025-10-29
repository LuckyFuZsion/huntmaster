"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function AdvancedTimeDateWidgetContent() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const searchParams = useSearchParams()

  // Widget customization options from URL parameters
  const format = searchParams.get("format") || "12" // 12 or 24 hour format
  const showSeconds = searchParams.get("seconds") !== "false" // Show seconds by default
  const showDate = searchParams.get("date") !== "false" // Show date by default
  const theme = searchParams.get("theme") || "default" // Color theme
  const size = searchParams.get("size") || "large" // Widget size

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

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case "neon":
        return {
          textColor: "#00ffff",
          glowColor: "0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff",
          dateColor: "#ff00ff",
          dateGlow: "0 0 8px #ff00ff, 0 0 16px #ff00ff",
        }
      case "sunset":
        return {
          textColor: "#ff9e00",
          glowColor: "0 0 10px #ff9e00, 0 0 20px #ff5e00",
          dateColor: "#ff5e00",
          dateGlow: "0 0 8px #ff5e00",
        }
      case "forest":
        return {
          textColor: "#00ff9e",
          glowColor: "0 0 10px #00ff9e, 0 0 20px #00aa5e",
          dateColor: "#00aa5e",
          dateGlow: "0 0 8px #00aa5e",
        }
      case "purple":
        return {
          textColor: "#c792ea",
          glowColor: "0 0 10px #c792ea, 0 0 20px #a170c7",
          dateColor: "#a170c7",
          dateGlow: "0 0 8px #a170c7",
        }
      default:
        return {
          textColor: "#ffffff",
          glowColor: "0 0 10px rgba(255,255,255,0.7)",
          dateColor: "rgba(255,255,255,0.9)",
          dateGlow: "0 0 8px rgba(255,255,255,0.5)",
        }
    }
  }

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return {
          timeClass: "text-4xl",
          dateClass: "text-sm",
        }
      case "medium":
        return {
          timeClass: "text-5xl",
          dateClass: "text-xl",
        }
      case "large":
        return {
          timeClass: "text-7xl",
          dateClass: "text-2xl",
        }
      case "xlarge":
        return {
          timeClass: "text-8xl",
          dateClass: "text-3xl",
        }
      default:
        return {
          timeClass: "text-7xl",
          dateClass: "text-2xl",
        }
    }
  }

  const themeColors = getThemeColors()
  const sizeClasses = getSizeClasses()

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
                  background: `radial-gradient(circle, ${themeColors.textColor}80 0%, ${themeColors.textColor}00 70%)`,
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
            className={`font-bold tracking-tight ${sizeClasses.timeClass}`}
            style={{
              color: themeColors.textColor,
              textShadow: themeColors.glowColor,
            }}
          >
            {formatTime()}
          </div>

          {showDate && (
            <div
              className={`font-medium mt-2 tracking-wide ${sizeClasses.dateClass}`}
              style={{
                color: themeColors.dateColor,
                textShadow: themeColors.dateGlow,
              }}
            >
              {formatDate()}
            </div>
          )}
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

export default function AdvancedTimeDateWidget() {
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
      <AdvancedTimeDateWidgetContent />
    </Suspense>
  )
}
