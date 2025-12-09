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

// Version history data structure
interface VersionUpdate {
  version: string
  date: string
  changes: string[]
}

// Version history data - newest first
const versionHistory: VersionUpdate[] = [
  {
    version: "2.0.0",
    date: "December 2025",
    changes: [
      "Major UI overhaul: Dashboard now matches browser extension's dark blue theme with grid pattern overlay",
      "Browser extension auto-update: Now automatically updates 'Now Playing' widget when valid games are detected",
      "Smart game detection: Extension filters out generic casino terms (casino, lobby, home, etc.) to prevent false updates",
      "Tab locking: Browser extension can now be locked to a specific browser tab for focused game detection",
      "Plan expiration system: Added subscription plan expiration tracking and validation at login",
      "Admin enhancements: Admins can now set and manage user plan expiration dates in the admin panel",
      "User dashboard: Users can now view their subscription plan status and expiration date",
      "Interactive instructions: Complete user guide with tabbed interface and mobile-friendly hamburger menu",
      "Instructions popout: Instructions can now be opened in a new browser tab for better viewing",
      "Edit slot improvements: Edit dialog now shows existing stake value with proper formatting (2 decimal places)",
      "Database optimization: Replaced external API calls with direct Supabase database queries for game suggestions",
      "Improved validation: Enhanced game title validation to prevent invalid names from being detected",
      "Extension theme consistency: All UI elements now use consistent extension-style colors and design",
    ],
  },
  {
    version: "1.3.0",
    date: "March 11, 2025",
    changes: [
      "Fixed capitalization of words with apostrophes (e.g., 'Buffalo's' now displays correctly)",
      "Added version history section to track updates",
      "Improved OBS browser source performance",
      "Enhanced mobile responsiveness",
    ],
  },
  {
    version: "1.2.0",
    date: "February 28, 2025",
    changes: [
      "Added Spider browser source with customizable colors",
      "Added support for Super Bonus toggle when adding slots",
      "Improved scrolling performance in all browser sources",
      "Fixed bug with win amount calculations",
    ],
  },
  {
    version: "1.1.0",
    date: "January 15, 2025",
    changes: [
      "Added multiple OBS browser source styles (OBS 1-8)",
      "Added customizable font sizes and styles",
      "Implemented widget system for progress bar, top wins, etc.",
      "Improved data persistence",
    ],
  },
  {
    version: "1.0.0",
    date: "December 10, 2024",
    changes: [
      "Initial release",
      "Basic bonus hunt tracking functionality",
      "OBS browser source integration",
      "User authentication system",
    ],
  },
]

export function VersionHistory() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="h-3 w-3" />
          <span>v{versionHistory[0].version}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>Recent updates and changes to Huntmaster</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {versionHistory.map((update) => (
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
