import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ProtectionWrapper } from "@/components/protection-wrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Bonus Hunt Tracker",
  description: "Track your slot game bonuses and winnings",
  generator: 'v0.app',
  icons: {
    icon: '/HM.png',
    shortcut: '/HM.png',
    apple: '/HM.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <ProtectionWrapper>{children}</ProtectionWrapper>
      </body>
    </html>
  )
}
