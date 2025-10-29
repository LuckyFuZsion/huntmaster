import { Suspense } from "react"
import OBSBrowserSource from "@/components/obs-browser-source"

export default function OBSPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OBSBrowserSource />
    </Suspense>
  )
}
