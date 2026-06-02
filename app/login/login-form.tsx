"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { login } from "../actions/auth"
import { FaDiscord } from "react-icons/fa"
import { InactiveUserModal } from "@/components/inactive-user-modal"
import { decryptSession } from "@/lib/session-crypto"

export function LoginForm() {
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [showInactiveModal, setShowInactiveModal] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    
    // Check if already logged in
    const session = localStorage.getItem("huntmaster_session")
    if (session) {
      try {
        // Check if user is inactive in session
        const sessionData = JSON.parse(decryptSession(session))
        if (sessionData.isActive === false) {
          setShowInactiveModal(true)
          return
        }
        // User is active, redirect to dashboard
        router.push("/dashboard")
        return
      } catch (e) {
        // Invalid session, continue to login
      }
    }

    // Check for inactive parameter in URL (from Discord callback)
    const inactiveParam = searchParams.get("inactive")
    if (inactiveParam === "true") {
      setShowInactiveModal(true)
    }

    // Check for error parameter in URL
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(decodeURIComponent(errorParam.replace(/\+/g, " ")))
    }
  }, [router, searchParams])

  async function handleSubmit(formData: FormData) {
    setError("")

    startTransition(async () => {
      const result = await login(formData)

      if (result.inactive) {
        // User is inactive - show modal
        setShowInactiveModal(true)
        // Clear any session if exists
        localStorage.removeItem("huntmaster_session")
      } else if (result.error) {
        setError(result.error)
      } else if (result.success && result.session) {
        localStorage.setItem("huntmaster_session", result.session)
        router.push("/dashboard")
      }
    })
  }

  const handleDiscordLogin = () => {
    window.location.href = "/api/auth/discord"
  }

  return (
    <div className="space-y-4" suppressHydrationWarning>
      <form action={handleSubmit} className="space-y-4" suppressHydrationWarning>
        <div className="space-y-2">
          <Input type="text" name="username" placeholder="Username" disabled={isPending} required suppressHydrationWarning />
        </div>
        <div className="space-y-2 relative">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              className="pr-10"
              disabled={isPending}
              required
              suppressHydrationWarning
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isPending}
              suppressHydrationWarning
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {error && (
          <Alert className="bg-destructive text-destructive-foreground">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-full" disabled={isPending} suppressHydrationWarning>
          {isPending ? "Logging in..." : "Login"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center justify-center gap-2 bg-[#5865F2] text-white hover:bg-[#4752C4]"
        onClick={handleDiscordLogin}
        suppressHydrationWarning
      >
        <FaDiscord className="h-5 w-5" />
        Login with Discord
      </Button>

      <InactiveUserModal 
        open={showInactiveModal} 
        onClose={() => {
          setShowInactiveModal(false)
          // Clear session when modal is closed
          localStorage.removeItem("huntmaster_session")
        }} 
      />
    </div>
  )
}
