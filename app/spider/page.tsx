import { Suspense } from "react"
import SpiderBrowserSource from "@/components/spider-browser-source"

export default function SpiderPage() {
  return (
    <Suspense>
      <SpiderBrowserSource />
    </Suspense>
  )
}

