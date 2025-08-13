import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Spider Browser Source",
  description: "Spider Browser Source for OBS",
}

export default function SpiderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
