"use client"

import Link from "next/link"
import { Info, Zap, LogOut, Gamepad2, Plus, FileIcon, Check, RefreshCw, Clipboard, Monitor, Link2, Settings, Copy, Menu } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState } from "react"

interface WidgetItemProps {
  url: string
  imageSrc: string
  title?: string
}

function WidgetItem({ url, imageSrc, title }: WidgetItemProps) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      {title && (
        <h4 className="text-sm font-semibold mb-2">{title}</h4>
      )}
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
        <Image
          src={imageSrc || "/placeholder.svg"}
          alt="Widget preview"
          fill
          style={{ objectFit: "contain" }}
          className="rounded-md"
        />
      </div>
      <p className="text-xs md:text-sm break-all overflow-wrap-anywhere">{url}</p>
    </div>
  )
}

interface InstructionsContentProps {
  currentUsername?: string | null
  isStandalonePage?: boolean
}

export function InstructionsContent({ currentUsername, isStandalonePage = false }: InstructionsContentProps) {
  const [activeTab, setActiveTab] = useState("getting-started")
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const tabOptions = [
    { value: "getting-started", label: "Getting Started", icon: Zap },
    { value: "managing-hunt", label: "Managing Hunt", icon: Gamepad2 },
    { value: "obs-setup", label: "OBS Setup", icon: Monitor },
    { value: "widgets", label: "Widgets", icon: Link2 },
    { value: "extension", label: "Extension", icon: Settings },
  ]

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setIsSheetOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Mobile Hamburger Menu - Only show on standalone page */}
      {isStandalonePage && (
        <div className="md:hidden flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">HuntMaster 2.0 - User Guide</h1>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 space-y-2">
                {tabOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleTabChange(option.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === option.value
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{option.label}</span>
                    </button>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop Tabs - Hidden on mobile when standalone */}
        <div className={`overflow-x-auto -mx-4 px-4 mb-4 md:mx-0 md:px-0 ${isStandalonePage ? 'hidden md:block' : ''}`}>
          <TabsList className="inline-flex w-full md:grid md:grid-cols-5 min-w-max md:min-w-0">
            <TabsTrigger value="getting-started" className="flex items-center gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm px-2 md:px-3">
              <Zap className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Getting Started</span>
              <span className="sm:hidden">Start</span>
            </TabsTrigger>
            <TabsTrigger value="managing-hunt" className="flex items-center gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm px-2 md:px-3">
              <Gamepad2 className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Managing Hunt</span>
              <span className="sm:hidden">Hunt</span>
            </TabsTrigger>
            <TabsTrigger value="obs-setup" className="flex items-center gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm px-2 md:px-3">
              <Monitor className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">OBS Setup</span>
              <span className="sm:hidden">OBS</span>
            </TabsTrigger>
            <TabsTrigger value="widgets" className="flex items-center gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm px-2 md:px-3">
              <Link2 className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span>Widgets</span>
            </TabsTrigger>
            <TabsTrigger value="extension" className="flex items-center gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm px-2 md:px-3">
              <Settings className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span>Extension</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="getting-started" className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Welcome to HuntMaster 2.0!
            </h3>
            <p className="text-sm text-muted-foreground">
              HuntMaster is a comprehensive bonus hunt tracking system designed for streamers. Track your hunts, manage slots, 
              and display beautiful overlays and widgets in OBS Studio.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="obs-dock-setup">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Step 1: Set Up OBS Custom Dock (Required First Step)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  The OBS Custom Dock is essential for using HuntMaster. It allows you to manage your hunt directly from OBS Studio.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Open OBS Studio</li>
                  <li className="font-medium">Navigate to: <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm break-all">View → Docks → Custom Browser Docks</code></li>
                  <li className="font-medium">Click <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm">+</code> to add a new dock</li>
                  <li className="font-medium">Enter dock name: <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm break-all">Huntmaster</code></li>
                  <li className="font-medium">Enter URL: <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm break-all">https://huntmaster.vercel.app/</code></li>
                  <li className="font-medium">Position the dock on the left or right side of your OBS window</li>
                </ol>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded mt-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>💡 Tip:</strong> You can resize the dock by dragging its edges. Make it wide enough to see all controls comfortably.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="login-setup">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <LogOut className="w-5 h-5" />
                  Step 2: Log In to Your Account
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  You need to log in to access your personalized hunt data and widgets.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Click the <strong>"Log In"</strong> button in the top right corner</li>
                  <li className="font-medium">Enter your username and password</li>
                  <li className="font-medium">Once logged in, your username will appear in the top right</li>
                  <li className="font-medium">All your hunt data is saved to your account and synced across devices</li>
                </ol>
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded mt-3">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    <strong>✅ Security:</strong> Your data is private and isolated. Each user can only see their own hunt information.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="first-hunt">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Step 3: Start Your First Hunt
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Ready to start tracking? Here's how to begin your first bonus hunt.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Enter your <strong>Starting Balance</strong> in the input field at the top</li>
                  <li className="font-medium">Enter your <strong>Ending Balance</strong> (you can update this later)</li>
                  <li className="font-medium">Add slots to your hunt (see "Managing Hunt" tab for details)</li>
                  <li className="font-medium">Set up OBS overlays to display your hunt on stream</li>
                </ol>
                <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded mt-3">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>🎯 Pro Tip:</strong> You can start a new hunt anytime by clicking "New Hunt" - this clears all current data.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="managing-hunt" className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              Managing Your Bonus Hunt
            </h3>
            <p className="text-sm text-muted-foreground">
              Learn how to add slots, record wins, and manage your hunt data effectively.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="adding-slots">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Adding Slots to Your Hunt
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Add games to your bonus hunt list with their stake amounts.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Type the slot name in the <strong>"Slot Name"</strong> field</li>
                  <li className="font-medium">Use the autocomplete dropdown to find games quickly (starts searching after 2 characters)</li>
                  <li className="font-medium">Enter the <strong>stake amount</strong> (bet size) for this slot</li>
                  <li className="font-medium">Click <strong>"Add Slot"</strong> or press <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm">Enter</code></li>
                  <li className="font-medium">The slot will appear in your hunt list immediately</li>
                </ol>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded mt-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>💡 Autocomplete:</strong> The search uses your database to find games instantly. Cached results appear immediately while typing!
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="viewing-editing-slots">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <FileIcon className="w-5 h-5" />
                  Viewing and Editing Your Slot List
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Manage all your slots in one place - view, edit, or remove them as needed.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Click <strong>"View Slotlist"</strong> button to see all your slots</li>
                  <li className="font-medium">The table shows: Slot Name, Bet, Win, and X Win multiplier</li>
                  <li className="font-medium">To edit a slot: Click on the slot name or bet to modify it</li>
                  <li className="font-medium">To remove a slot: Click the <strong>"-"</strong> button next to it</li>
                  <li className="font-medium">Changes are saved automatically after 1 second</li>
                </ol>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded mt-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    <strong>⚡ Auto-Save:</strong> Your changes are automatically saved. No need to click a save button!
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="recording-wins">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Recording Win Amounts
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Record your wins for each bonus round to track your hunt performance.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Click <strong>"Collect Bonuses"</strong> button</li>
                  <li className="font-medium">You'll see all your slots listed one by one</li>
                  <li className="font-medium">Enter the win amount for each slot (or leave blank if no win)</li>
                  <li className="font-medium">Click <strong>"Next"</strong> to move to the next slot</li>
                  <li className="font-medium">The X Win multiplier is calculated automatically (Win ÷ Bet)</li>
                  <li className="font-medium">Your best win per game is automatically tracked and saved</li>
                </ol>
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded mt-3">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    <strong>🏆 Best Wins:</strong> Only your biggest win per game is saved. If you play the same game multiple times, only the highest win is recorded.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="balances">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Managing Start and End Balances
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Track your balance changes throughout the hunt.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Enter your <strong>Starting Balance</strong> at the beginning of your hunt</li>
                  <li className="font-medium">Update your <strong>Ending Balance</strong> when you finish</li>
                  <li className="font-medium">The profit/loss is calculated automatically and displayed in widgets</li>
                  <li className="font-medium">Balances are saved automatically and appear in your OBS overlays</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="copying-hunt">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Clipboard className="w-5 h-5" />
                  Copying Hunt Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Copy your hunt summary to share or save for records.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Click the <strong>clipboard icon</strong> at the bottom of the page</li>
                  <li className="font-medium">Your complete hunt details will be copied to clipboard</li>
                  <li className="font-medium">Includes: Start/End balance, all slots with bets and wins, and totals</li>
                  <li className="font-medium">Paste anywhere (Discord, notes, etc.) to share your hunt results</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="obs-setup" className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              OBS Studio Setup & Customization
            </h3>
            <p className="text-sm text-muted-foreground">
              Set up and customize your OBS browser sources to display your hunt on stream.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="adding-browser-sources">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Adding Browser Sources to OBS
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Add HuntMaster overlays to your OBS scene to display your hunt information.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Click <strong>"Customise OBS"</strong> button in HuntMaster</li>
                  <li className="font-medium">Choose which overlay you want (OBS 1, OBS 2, OBS 3, etc.)</li>
                  <li className="font-medium">Click the <strong>clipboard icon</strong> next to the overlay to copy its URL</li>
                  <li className="font-medium">In OBS Studio, right-click in Sources → <strong>"Add"</strong> → <strong>"Browser Source"</strong></li>
                  <li className="font-medium">Name it (e.g., "HuntMaster Overlay 1")</li>
                  <li className="font-medium">Paste the copied URL into the <strong>"URL"</strong> field</li>
                  <li className="font-medium">Set the width and height according to the overlay specifications</li>
                  <li className="font-medium">Click <strong>"OK"</strong> to add it to your scene</li>
                </ol>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded mt-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>📌 Personalized URLs:</strong> Each URL includes your username, so it only shows YOUR hunt data.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="resizing-sources">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Resizing OBS Browser Sources
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Adjust the size of your overlays to fit your stream layout perfectly.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">In HuntMaster, go to <strong>"Customise OBS"</strong> menu</li>
                  <li className="font-medium">Find the overlay you want to resize</li>
                  <li className="font-medium">Use the <strong>size dropdown</strong> to select a new size (e.g., 400px, 600px, 800px)</li>
                  <li className="font-medium">Click the <strong>clipboard icon</strong> to copy the new URL with updated size</li>
                  <li className="font-medium">In OBS Studio, right-click your browser source → <strong>"Properties"</strong></li>
                  <li className="font-medium">Replace the URL with the newly copied one</li>
                  <li className="font-medium">Update the <strong>"Height"</strong> to match your selected size</li>
                  <li className="font-medium">Keep the <strong>"Width"</strong> at the default for that overlay:
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>OBS 1: 600px width</li>
                      <li>OBS 2: 400px width</li>
                      <li>OBS 3: 600px width</li>
                      <li>OBS 4: 520px width</li>
                      <li>OBS 5: 700px width</li>
                      <li>OBS 7: 700px width</li>
                      <li>OBS 8: 700px width</li>
                    </ul>
                  </li>
                  <li className="font-medium">Click <strong>"OK"</strong> to apply changes</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="overlay-types">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Available Overlay Types
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-3 text-sm">
                  <div>
                    <strong className="text-base">OBS 1 - Main Overlay:</strong>
                    <p className="text-muted-foreground mt-1">Full hunt information with balances, slot list, and totals. Best for comprehensive display.</p>
                  </div>
                  <div>
                    <strong className="text-base">OBS 2 - Compact Overlay:</strong>
                    <p className="text-muted-foreground mt-1">Smaller, compact version perfect for corner placement.</p>
                  </div>
                  <div>
                    <strong className="text-base">OBS 3 - Highlighted Current:</strong>
                    <p className="text-muted-foreground mt-1">Highlights the current slot being played with visual emphasis.</p>
                  </div>
                  <div>
                    <strong className="text-base">OBS 4 - Minimal Design:</strong>
                    <p className="text-muted-foreground mt-1">Clean, minimal design with essential information only.</p>
                  </div>
                  <div>
                    <strong className="text-base">OBS 5 - Scrollable List:</strong>
                    <p className="text-muted-foreground mt-1">Scrollable slot list with customizable corner radius for rounded corners.</p>
                  </div>
                  <div>
                    <strong className="text-base">OBS 7 - Hunt Info Widget:</strong>
                    <p className="text-muted-foreground mt-1">Displays hunt summary with start/end balance and profit/loss.</p>
                  </div>
                  <div>
                    <strong className="text-base">OBS 8 - Alternative Layout:</strong>
                    <p className="text-muted-foreground mt-1">Alternative layout option with different styling.</p>
                  </div>
                  <div>
                    <strong className="text-base">Spider Overlay:</strong>
                    <p className="text-muted-foreground mt-1">Highly customizable overlay with unique spider-web design. Visit <Link href="/spider-edit" target="_blank" className="text-blue-600 hover:underline dark:text-blue-400">/spider-edit</Link> to customize colors, fonts, and more.</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="widgets" className="space-y-4">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Widgets & Additional Overlays
            </h3>
            <p className="text-sm text-muted-foreground">
              Discover all available widgets to enhance your stream with additional information displays.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="widget-overview">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Widget Overview
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Widgets are smaller, focused displays that show specific information. Perfect for adding to your stream layout.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded">
                    <strong>Progress Bar:</strong> Visual progress indicator for your hunt
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded">
                    <strong>Top Wins:</strong> Displays your best wins from the hunt
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded">
                    <strong>Hunt Stats:</strong> Summary statistics of your hunt
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded">
                    <strong>Next Bonus:</strong> Shows the next slot in your hunt list
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded">
                    <strong>Start Balance:</strong> Displays your starting balance
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded">
                    <strong>Time & Date:</strong> Current time and date display
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded">
                    <strong>Now Playing:</strong> Shows current game (from extension or hunt)
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="time-date-widgets">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Time & Date Widgets
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Two time/date widgets available - basic and advanced with customization options.
                </p>
                <div className="space-y-3">
                  <div>
                    <strong className="text-sm">Basic Time & Date Widget:</strong>
                    <p className="text-xs text-muted-foreground mt-1">Simple, clean display with transparent background.</p>
                  </div>
                  <div>
                    <strong className="text-sm">Advanced Time & Date Widget:</strong>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">Highly customizable with URL parameters:</p>
                    <ul className="list-disc ml-6 space-y-1 text-xs">
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?format=24</code> - 24-hour format</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?format=12</code> - 12-hour format with AM/PM</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?seconds=false</code> - Hide seconds</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?date=false</code> - Hide date</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?theme=neon</code> - Neon theme</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?theme=sunset</code> - Sunset theme</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?theme=forest</code> - Forest theme</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?theme=purple</code> - Purple theme</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?size=small</code> - Small size</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?size=medium</code> - Medium size</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?size=large</code> - Large size</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?size=xlarge</code> - Extra large size</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Example:</strong> <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">/widgets/time-date-advanced?theme=neon&format=24&size=large</code>
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="now-playing-widget">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Now Playing Widget
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Display the current game you're playing on stream.
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Extension Source:</strong>
                    <p className="text-xs text-muted-foreground mt-1">Shows the game detected by the browser extension (auto-updates when you switch games).</p>
                    <p className="text-xs text-muted-foreground mt-1">Use: <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?source=extension</code></p>
                  </div>
                  <div>
                    <strong>Bonus Hunt Source:</strong>
                    <p className="text-xs text-muted-foreground mt-1">Shows the current game from your bonus hunt list.</p>
                    <p className="text-xs text-muted-foreground mt-1">Use: <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-xs break-all">?source=hunt</code></p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="widget-urls">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Copy className="w-5 h-5" />
                  Getting Widget URLs
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  All widget URLs are personalized for your account and available in the instructions.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Click <strong>"Show Widgets Menu"</strong> button</li>
                  <li className="font-medium">Browse available widgets</li>
                  <li className="font-medium">Click the <strong>clipboard icon</strong> to copy a widget URL</li>
                  <li className="font-medium">Add as Browser Source in OBS Studio</li>
                  <li className="font-medium">Widgets automatically update to show your hunt data</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="bg-blue-100 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 mb-4 rounded-r">
            <div className="font-bold">📌 All Widget URLs</div>
            <p className="mt-2 text-sm">
              Below are all available widget and overlay URLs personalized for <strong>{currentUsername || "your account"}</strong>. 
              Each URL includes your username, so it only displays YOUR hunt data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <WidgetItem
              url={`http://huntmaster.vercel.app/obs?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/main-obs-browser-source.png-2RlwuBNGOkYET3pIouxJq3YHoSPoZq.png"
              title="OBS 1 - Main Overlay"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/obs-2?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-2.png-k64OYIEnlEcLRCLPPk2CfJ9OcJruFQ.png"
              title="OBS 2 - Compact"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/obs-3?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-3.png-9TCrvW2SagQQVoQ9FYu0ORCvoto50o.png"
              title="OBS 3 - Highlighted"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/obs-4?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-4.png-FI75hlCjnnIRoPvTu7gpfJIUwob6DM.png"
              title="OBS 4 - Minimal"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/obs-5?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="OBS 5 - Scrollable"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/obs-7?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="OBS 7 - Hunt Info"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/obs-8?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="OBS 8 - Alternative"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/spider?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="Spider Overlay"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/progress-bar?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/progress-bar-widget.png-NDrWkJkNn45TPvyo7WZEQvoOcwT9qi.png"
              title="Progress Bar"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/top-wins?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/top-wins-widget.png-AxXX4ovkJqoMC4sKZpwRxXTMeFBTJ7.png"
              title="Top Wins"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/hunt-stats?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/hunt-stats-widget.png-m4l9PjOT411kJqW9j52rQHMZUyoFZ9.png"
              title="Hunt Stats"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/next-bonus?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="Next Bonus"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/start-balance?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="Start Balance"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/time-date?user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="Time & Date"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/time-date-advanced?theme=neon&user=${currentUsername}`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="Time & Date Advanced"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/now-playing?user=${currentUsername}&source=extension`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="Now Playing (Extension)"
            />
            <WidgetItem
              url={`http://huntmaster.vercel.app/widgets/now-playing?user=${currentUsername}&source=hunt`}
              imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              title="Now Playing (Bonus Hunt)"
            />
          </div>
        </TabsContent>

        <TabsContent value="extension" className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Browser Extension Guide
            </h3>
            <p className="text-sm text-muted-foreground">
              Automatically detect games from casino sites and update your Now Playing widget in real-time.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="extension-install">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Installing the Browser Extension
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Install HuntMaster 2.0 browser extension to automatically detect games from casino sites.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Download the extension ZIP file from the browser-extension folder</li>
                  <li className="font-medium">Extract the ZIP file to a folder on your computer</li>
                  <li className="font-medium">Open Chrome/Edge and go to <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm break-all">chrome://extensions/</code></li>
                  <li className="font-medium">Enable <strong>"Developer mode"</strong> (toggle in top right)</li>
                  <li className="font-medium">Click <strong>"Load unpacked"</strong></li>
                  <li className="font-medium">Select the extracted extension folder</li>
                  <li className="font-medium">The extension icon should appear in your browser toolbar</li>
                </ol>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded mt-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    <strong>⚠️ Note:</strong> You'll need to get a session token from HuntMaster to use the extension. See "Getting Session Token" below.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="session-token">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Copy className="w-5 h-5" />
                  Getting Your Session Token
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  The extension needs your session token to authenticate and update your hunt data.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="font-medium">Log in to HuntMaster in your browser</li>
                  <li className="font-medium">Visit <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm break-all">/get-session-token</code></li>
                  <li className="font-medium">Copy the session token that appears</li>
                  <li className="font-medium">Open the extension popup</li>
                  <li className="font-medium">Paste the token into the extension</li>
                  <li className="font-medium">The extension will now be connected to your account</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="extension-features">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Extension Features
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-3 text-sm">
                  <div>
                    <strong className="text-base flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Auto Game Detection
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically detects the game you're playing on casino sites and updates your "Now Playing" widget in real-time.
                    </p>
                  </div>
                  <div>
                    <strong className="text-base flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add to Bonus Hunt
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quickly add the detected game to your bonus hunt list with a stake amount. Perfect for when you want to add a game you're currently playing.
                    </p>
                    <ol className="list-decimal list-inside ml-4 mt-2 space-y-1 text-xs">
                      <li>Enter the stake amount in the "Stake" field</li>
                      <li>Click "🎯 Add to Hunt"</li>
                      <li>You'll see a confirmation message</li>
                      <li>The game is added to your hunt list immediately</li>
                    </ol>
                  </div>
                  <div>
                    <strong className="text-base flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Lock to Tab
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lock the extension to a specific browser tab to prevent it from detecting games on other tabs. Useful when you have multiple casino sites open.
                    </p>
                    <ol className="list-decimal list-inside ml-4 mt-2 space-y-1 text-xs">
                      <li>Navigate to the casino tab you want to monitor</li>
                      <li>Click "🔒 Lock to This Tab" in the extension</li>
                      <li>The extension will only detect games on that tab</li>
                      <li>If you close the locked tab, the lock is automatically released</li>
                    </ol>
                  </div>
                  <div>
                    <strong className="text-base flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Manual Refresh
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "🔄 Refresh Detection" to manually trigger game detection if auto-detection didn't work.
                    </p>
                  </div>
                  <div>
                    <strong className="text-base flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Update Current Game
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manually update the current game if auto-detection shows the wrong game or you want to override it.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="extension-troubleshooting">
              <AccordionTrigger className="font-semibold">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Extension Troubleshooting
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Game not detected?</strong>
                    <ul className="list-disc ml-6 mt-1 space-y-1 text-xs">
                      <li>Make sure you're on a supported casino site</li>
                      <li>Try clicking "🔄 Refresh Detection"</li>
                      <li>Check if the game name is visible on the page</li>
                      <li>Some sites may require you to be in the game (not just lobby)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Extension not updating?</strong>
                    <ul className="list-disc ml-6 mt-1 space-y-1 text-xs">
                      <li>Check if your session token is still valid (re-login if needed)</li>
                      <li>Make sure you're logged in to HuntMaster</li>
                      <li>Check browser console for errors (F12)</li>
                      <li>Try refreshing the extension or reloading the page</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Wrong game detected?</strong>
                    <ul className="list-disc ml-6 mt-1 space-y-1 text-xs">
                      <li>You can manually edit the game name in the extension</li>
                      <li>Click "Update Current Game" to override the detection</li>
                      <li>The extension will use your manual entry</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>

      <div className="bg-green-100 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 mt-4 rounded-r">
        <div className="font-bold">💡 Pro Tips</div>
        <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
          <li>Use the browser extension for automatic game detection - it saves time and keeps your "Now Playing" widget updated</li>
          <li>All your data is saved automatically - no need to manually save</li>
          <li>You can have multiple OBS overlays showing different information simultaneously</li>
          <li>Widgets update in real-time as you make changes to your hunt</li>
          <li>Use the Spider overlay customization page to match your stream's color scheme</li>
          <li>Copy hunt details after each hunt to keep records of your sessions</li>
        </ul>
      </div>

      <div className="bg-blue-100 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 mt-4 rounded-r">
        <div className="font-bold">📌 Personalized URLs</div>
        <p className="mt-2 text-sm">
          All URLs shown above are personalized for <strong>{currentUsername || "your account"}</strong>. 
          Each user's data is completely isolated - your overlays will only show YOUR hunt information.
        </p>
        <p className="mt-2 text-sm">
          <strong>To use in OBS:</strong> Add a Browser Source, paste the URL, and set the appropriate width/height. 
          The overlay will automatically display your hunt data and update in real-time.
        </p>
      </div>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <strong>Customization Note:</strong> The Spider overlay is highly customizable! Visit{" "}
        <Link href="/spider-edit" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
          /spider-edit
        </Link>{" "}
        to customize colors, fonts, header text, border width, and more. Your customization settings are saved automatically.
      </p>
    </div>
  )
}

