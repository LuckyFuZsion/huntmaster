"use client"

import type React from "react"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function ProtectionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Skip protection for admin routes
    if (pathname?.startsWith("/admin/")) {
      return
    }

    // Basic protection
    const applyProtection = () => {
      // Disable text selection
      document.body.style.userSelect = "none"
      document.body.style.webkitUserSelect = "none"

      // Disable right-click
      document.addEventListener("contextmenu", (e) => e.preventDefault())

      // Allow paste in input fields and with Ctrl+V
      document.addEventListener("copy", (e) => {
        const target = e.target as HTMLElement
        const isButton = target.closest("button")
        const isPasswordField = target.closest("input[type='password']")
        const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

        if (isButton || isPasswordField || isInputField || target.classList.contains("copy-enabled")) {
          // Allow copy in these cases
          return
        }
        e.preventDefault()
      })

      document.addEventListener("paste", (e) => {
        const target = e.target as HTMLElement
        const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

        if (isInputField || target.classList.contains("copy-enabled")) {
          // Allow paste in input fields
          return
        }
        e.preventDefault()
      })

      document.addEventListener("cut", (e) => {
        const target = e.target as HTMLElement
        const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

        if (isInputField) {
          // Allow cut in input fields
          return
        }
        e.preventDefault()
      })

      // Disable keyboard shortcuts except for Ctrl+V (paste)
      document.addEventListener("keydown", (e) => {
        // Allow Ctrl+V for paste
        if (e.ctrlKey && e.key === "v") {
          return true
        }

        // Allow Ctrl+C for copy in input fields
        if (e.ctrlKey && e.key === "c") {
          const target = e.target as HTMLElement
          const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
          if (isInputField) {
            return true
          }
        }

        // Block other developer tools shortcuts
        if (
          e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
          (e.ctrlKey && e.key === "U") ||
          (e.ctrlKey && e.key === "S") ||
          (e.altKey && e.key === "F12")
        ) {
          e.preventDefault()
          return false
        }
      })
    }

    // Apply protection
    applyProtection()

    // Cleanup function
    return () => {
      document.body.style.userSelect = "auto"
      document.body.style.webkitUserSelect = "auto"
    }
  }, [pathname])

  return <>{children}</>
}

