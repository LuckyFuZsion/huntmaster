import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Spider Browser Source Editor",
  description: "Color editor for Spider Browser Source",
}

export default function SpiderEditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

