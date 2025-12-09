"use client"
import { BonusHuntTracker } from "@/components/bonus-hunt-tracker"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { decrypt } from "@/lib/protection"
import { VersionHistory } from "@/components/version-history"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [username, setUsername] = useState("")
  const [isRedirecting, setIsRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isRedirecting) return // Prevent multiple redirects

    try {
      const session = localStorage.getItem("huntmaster_session")
      if (!session) {
        setIsRedirecting(true)
        router.push("/login")
        return
      }

      const sessionData = JSON.parse(decrypt(session))
      if (!sessionData?.username) {
        throw new Error("Invalid session data")
      }

      setUsername(sessionData.username)
      setIsLoading(false)
    } catch (err) {
      console.error("Error decoding session:", err)
      localStorage.removeItem("huntmaster_session") // Clear invalid session
      setIsRedirecting(true)
      router.push("/login")
    }
  }, [router, isRedirecting])

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      >
        <style jsx>{`
          div::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
              linear-gradient(rgba(74, 158, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(74, 158, 255, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
            pointer-events: none;
            z-index: 0;
          }
          div::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(74, 158, 255, 0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            pointer-events: none;
            opacity: 0.3;
            z-index: 0;
          }
        `}</style>
        <Card className="w-[350px] relative z-10 bg-[rgba(26,26,46,0.6)] backdrop-blur-lg border-[rgba(74,158,255,0.2)]">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-[#8b9dc3]">Initializing application...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
        }
        .extension-theme-bg::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(74, 158, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74, 158, 255, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
          z-index: 0;
        }
        .extension-theme-bg::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(74, 158, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          opacity: 0.3;
          z-index: 0;
        }
      `}} />
      <div className="extension-theme-bg fixed inset-0"></div>
      <div className="absolute top-4 right-4 z-[5]">
        <VersionHistory />
      </div>
      <BonusHuntTracker />
    </div>
  )
}
