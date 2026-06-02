"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History } from "lucide-react"
import {
  APP_VERSION,
  EXTENSION_VERSION,
  appVersionHistory,
  extensionVersionHistory,
  type VersionUpdate,
} from "@/lib/version-history-data"

type HistoryTab = "app" | "extension"

function VersionList({ updates }: { updates: VersionUpdate[] }) {
  return (
    <div className="space-y-6">
      {updates.map((update) => (
        <div key={update.version} className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Version {update.version}</h3>
            <span className="text-sm text-muted-foreground">{update.date}</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {update.changes.map((change, index) => (
              <li key={index} className="text-sm">
                {change}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function VersionHistory() {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<HistoryTab>("app")

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="h-3 w-3" />
          <span>
            App v{APP_VERSION} · Ext v{EXTENSION_VERSION}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>Recent updates for the HuntMaster app and browser extension</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "app" ? "default" : "outline"}
            onClick={() => setTab("app")}
          >
            App v{APP_VERSION}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "extension" ? "default" : "outline"}
            onClick={() => setTab("extension")}
          >
            Extension v{EXTENSION_VERSION}
          </Button>
        </div>
        <ScrollArea className="max-h-[60vh] pr-4">
          {tab === "app" ? (
            <VersionList updates={appVersionHistory} />
          ) : (
            <VersionList updates={extensionVersionHistory} />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
