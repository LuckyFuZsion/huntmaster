import { Suspense } from "react"
import OBSBrowserSource from "@/components/obs-browser-source"

export default function OBSPage() {
  return (
    <Suspense>
      <OBSBrowserSource />
    </Suspense>
  )
}

