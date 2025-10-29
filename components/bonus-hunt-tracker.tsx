"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Clipboard, FileIcon, Plus, Minus, Info, LogOut, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { decrypt } from "@/lib/protection"
import { useRouter } from "next/navigation"
// Add the import for VersionHistory
import { VersionHistory } from "@/components/version-history"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

const fontOptions = [
  "Arial",
  "Helvetica",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Courier New",
  "Brush Script MT",
  "Raleway",
  "Poppins",
]

interface WidgetItemProps {
  url: string
  imageSrc: string
}

function WidgetItem({ url, imageSrc }: WidgetItemProps) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
        <Image
          src={imageSrc || "/placeholder.svg"}
          alt="Widget preview"
          fill
          style={{ objectFit: "contain" }}
          className="rounded-md"
        />
      </div>
      <p className="text-sm break-all">{url}</p>
    </div>
  )
}

export function BonusHuntTracker() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [newSlot, setNewSlot] = useState({ name: "", bet: "" })
  const [startBalance, setStartBalance] = useState("")
  const [endBalance, setEndBalance] = useState("")
  const slotListRef = useRef<HTMLDivElement>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [colourTheme, setColourTheme] = useState("blue")
  const [isSlotListVisible, setIsSlotListVisible] = useState(false)
  const [selectedFont, setSelectedFont] = useState("Arial")
  const [isCustomiseMenuVisible, setIsCustomiseMenuVisible] = useState(false)
  const [isSaveHuntDialogOpen, setIsSaveHuntDialogOpen] = useState(false)
  const [saveHuntName, setSaveHuntName] = useState("")
  const [isNewHuntDialogOpen, setIsNewHuntDialogOpen] = useState(false)
  const [fontSize, setFontSize] = useState(24)
  const [isWidgetsMenuVisible, setIsWidgetsMenuVisible] = useState(false)
  const [isInstructionsDialogOpen, setIsInstructionsDialogOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isClipboardDialogOpen, setIsClipboardDialogOpen] = useState(false)
  const [clipboardDialogContent, setClipboardDialogContent] = useState("")
  const [obsSizes, setObsSizes] = useState({
    obs: "600px",
    obs2: "600px",
    obs3: "600px",
    obs4: "300px",
    obs5: "600px",
  })
  const [isAdmin, setIsAdmin] = useState(false)
  const [cornerRadius, setCornerRadius] = useState("20px")
  const [isSuperBonus, setIsSuperBonus] = useState(false)

  const noSpinnerClass =
    "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

  const router = useRouter()

  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [currentUsername, setCurrentUsername] = useState("")

  useEffect(() => {
    const loadSlotsFromFirestore = async () => {
      try {
        const session = localStorage.getItem("huntmaster_session")
        if (session) {
          const response = await fetch("/api/slots", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session, action: "get" }),
          })
          const data = await response.json()
          if (data.success && data.slots) {
            setSlots(data.slots.map((slot: any) => ({
              id: slot.id,
              name: slot.name,
              bet: slot.bet,
              win: slot.win,
            })))
            setInitialLoadComplete(true)
          }
        }
      } catch (error) {
        console.error("Error loading slots from Firestore:", error)
        setInitialLoadComplete(true)
      }
    }

    // Load slots from Firestore
    loadSlotsFromFirestore()

    // Load user settings from Firestore
    const loadUserSettings = async () => {
      try {
        const session = localStorage.getItem("huntmaster_session")
        if (session) {
          const response = await fetch("/api/user-settings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session, action: "get" }),
          })
          const data = await response.json()
          if (data.success && data.settings) {
            console.log("Loaded settings from Firestore:", data.settings)
            // Load settings from Firestore - ensure strings are properly converted
            setStartBalance(data.settings.startBalance != null ? String(data.settings.startBalance) : "")
            setEndBalance(data.settings.endBalance != null ? String(data.settings.endBalance) : "")
            setColourTheme(data.settings.colourTheme || "blue")
            setSelectedFont(data.settings.selectedFont || "Arial")
            setFontSize(data.settings.fontSize || 24)
            setCornerRadius(data.settings.cornerRadius || "20px")
            return
          }
        }
      } catch (error) {
        console.error("Error loading user settings:", error)
      }
      // No localStorage fallback - each user should have their own settings in Firestore
    }

    loadUserSettings()

    // Check if user is admin and get username
    const session = localStorage.getItem("huntmaster_session")
    if (session) {
      try {
        const sessionData = JSON.parse(decrypt(session))
        setIsAdmin(sessionData.isAdmin)
        setCurrentUsername(sessionData.username)
      } catch (err) {
        console.error("Error checking admin status:", err)
        setIsAdmin(false)
      }
    }
  }, [])

  useEffect(() => {
    const savedSizes = localStorage.getItem("obsSizes")
    if (savedSizes) {
      setObsSizes(JSON.parse(savedSizes))
    }
  }, [])

  // Save slots to Firestore whenever they change (but not on initial load)
  useEffect(() => {
    if (!initialLoadComplete) {
      return // Don't save during initial load
    }

    const saveSlotsToFirestore = async () => {
      try {
        const session = localStorage.getItem("huntmaster_session")
        if (session && slots.length >= 0) {
          const response = await fetch("/api/slots", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session, action: "save", slots }),
          })
          const data = await response.json()
          // Update slots with Firestore IDs only if we have temporary IDs
          // This prevents infinite loops from setSlots triggering the useEffect
          if (data.success && data.slots) {
            // Check if we need to update (i.e., if any slot has a temporary Date.now() ID)
            const hasTempIds = slots.some(slot => slot.id.length > 20) // Firestore IDs are shorter
            if (hasTempIds) {
              setSlots(data.slots.map((slot: any) => ({
                id: slot.id,
                name: slot.name,
                bet: slot.bet,
                win: slot.win,
              })))
            }
          }
        }
      } catch (error) {
        console.error("Error saving slots to Firestore:", error)
      }
    }

    saveSlotsToFirestore()
  }, [slots, initialLoadComplete])

  // Save settings to Firestore and localStorage
  useEffect(() => {
    if (!initialLoadComplete) {
      return // Don't save during initial load
    }

    // Save to Firestore
    const saveSettingsToFirestore = async () => {
      const settingsToSave = {
        startBalance,
        endBalance,
        colourTheme,
        selectedFont,
        fontSize,
        cornerRadius,
      }
      console.log("Saving settings to Firestore:", settingsToSave)
      try {
        const session = localStorage.getItem("huntmaster_session")
        if (session) {
          await fetch("/api/user-settings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session,
              action: "save",
              settings: settingsToSave,
            }),
          })
        }
      } catch (error) {
        console.error("Error saving settings to Firestore:", error)
      }
    }

    saveSettingsToFirestore()
  }, [startBalance, endBalance, colourTheme, selectedFont, fontSize, cornerRadius, initialLoadComplete])

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault()
    if (newSlot.name && newSlot.bet) {
      // If super bonus is checked, append "(S)" to the slot name
      const slotName = isSuperBonus ? `${newSlot.name} (S)` : newSlot.name

      setSlots([
        ...slots,
        { id: Date.now().toString(), name: slotName, bet: Number.parseFloat(newSlot.bet), win: null },
      ])
      setNewSlot({ name: "", bet: "" })
      // Reset the super bonus toggle after adding a slot
      setIsSuperBonus(false)
    }
  }

  const handleEditSlot = (slot: Slot) => {
    setEditingSlot(slot)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (editingSlot) {
      setSlots(slots.map((slot) => (slot.id === editingSlot.id ? editingSlot : slot)))
      setIsEditing(false)
      setEditingSlot(null)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingSlot(null)
  }

  const openDeleteDialog = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteSlot = async () => {
    if (editingSlot) {
      // Remove slot from local state
      const updatedSlots = slots.filter((slot) => slot.id !== editingSlot.id)
      setSlots(updatedSlots)
      setIsDeleteDialogOpen(false)
      setEditingSlot(null)
      
      // Explicitly save to Firestore to ensure deletion persists
      try {
        const session = localStorage.getItem("huntmaster_session")
        if (session) {
          await fetch("/api/slots", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session, action: "save", slots: updatedSlots }),
          })
        }
      } catch (error) {
        console.error("Error saving after delete:", error)
      }
    }
  }

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName)
  }

  const copyToClipboard = (text: string, content: string) => {
    try {
      // Modern clipboard API approach - primary method
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setClipboardDialogContent(content)
          setIsClipboardDialogOpen(true)
        })
        .catch((err) => {
          console.error("Clipboard API failed:", err)

          // Fallback to the older execCommand method
          const textArea = document.createElement("textarea")
          textArea.value = text
          textArea.style.position = "fixed" // Make it invisible
          textArea.style.opacity = "0"
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()

          try {
            const successful = document.execCommand("copy")
            if (successful) {
              setClipboardDialogContent(content)
              setIsClipboardDialogOpen(true)
            } else {
              throw new Error("execCommand copy failed")
            }
          } catch (e) {
            console.error("Fallback clipboard method failed:", e)
            setClipboardDialogContent(
              "Failed to copy to clipboard. Please try manually selecting and copying the text.",
            )
            setIsClipboardDialogOpen(true)
          }

          document.body.removeChild(textArea)
        })
    } catch (err) {
      console.error("Could not copy text:", err)
      setClipboardDialogContent("Failed to copy to clipboard")
      setIsClipboardDialogOpen(true)
    }
  }

  const formatHuntDetails = useCallback(() => {
    const topTableInfo = `Start Balance: ${startBalance}
End Balance: ${endBalance}
Used Balance: ${(Number(startBalance) - Number(endBalance)).toFixed(2)}
Total Win: ${slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) : 0), 0).toFixed(2)}
Collected: ${slots.length}
Opened: ${slots.filter((slot) => slot.win !== null).length}
Avg X Win: ${(slots.reduce((sum, slot) => sum + (slot.win !== null ? Number(slot.win) / Number(slot.bet) : 0), 0) / slots.filter((slot) => slot.win !== null).length).toFixed(2)}
`

    const slotListInfo = slots
      .map((slot, index) => {
        return `${index + 1}\t${slot.name}\t${slot.bet.toFixed(2)}\t${slot.win !== null ? slot.win.toFixed(2) : "xx"}\t${slot.win !== null ? (Number(slot.win) / Number(slot.bet)).toFixed(2) : "-"}`
      })
      .join("\n")

    return `${topTableInfo}

#\tSlot Name\tBet\tWin\tX Win
${slotListInfo}`
  }, [startBalance, endBalance, slots])

  const handleCopyHuntDetails = useCallback(() => {
    const huntDetails = formatHuntDetails()

    try {
      // Modern clipboard API approach - primary method
      navigator.clipboard
        .writeText(huntDetails)
        .then(() => {
          setClipboardDialogContent("Hunt details copied to clipboard")
          setIsClipboardDialogOpen(true)
        })
        .catch((err) => {
          console.error("Clipboard API failed:", err)

          // Fallback to the older execCommand method
          const textArea = document.createElement("textarea")
          textArea.value = huntDetails
          textArea.style.position = "fixed" // Make it invisible
          textArea.style.opacity = "0"
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()

          try {
            const successful = document.execCommand("copy")
            if (successful) {
              setClipboardDialogContent("Hunt details copied to clipboard")
              setIsClipboardDialogOpen(true)
            } else {
              throw new Error("execCommand copy failed")
            }
          } catch (e) {
            console.error("Fallback clipboard method failed:", e)
            setClipboardDialogContent(
              "Failed to copy hunt details. Please try manually selecting and copying the text.",
            )
            setIsClipboardDialogOpen(true)
          }

          document.body.removeChild(textArea)
        })
    } catch (err) {
      console.error("Could not copy text:", err)
      setClipboardDialogContent("Failed to copy hunt details to clipboard")
      setIsClipboardDialogOpen(true)
    }
  }, [formatHuntDetails])

  const handleNewHunt = () => {
    setIsNewHuntDialogOpen(true)
  }

  const confirmNewHunt = async () => {
    // Clear slots from Firestore for this user
    try {
      const session = localStorage.getItem("huntmaster_session")
      if (session) {
        await fetch("/api/slots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session, action: "save", slots: [] }),
        })
        // Clear settings in Firestore
        await fetch("/api/user-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session,
            action: "save",
            settings: {
              startBalance: "",
              endBalance: "",
              colourTheme,
              selectedFont,
              fontSize,
              cornerRadius,
            },
          }),
        })
      }
    } catch (error) {
      console.error("Error clearing hunt data:", error)
    }
    
    setSlots([])
    setStartBalance("")
    setEndBalance("")
    setNewSlot({ name: "", bet: "" })
    setIsNewHuntDialogOpen(false)
  }

  const handleSaveHunt = () => {
    setIsSaveHuntDialogOpen(true)
  }

  const confirmSaveHunt = () => {
    if (saveHuntName) {
      // Create new hunt - simplified since we're not managing saved hunts anymore.
      setSaveHuntName("")
      setIsSaveHuntDialogOpen(false)
    }
  }

  const handleIncreaseFontSize = () => {
    setFontSize((prevSize) => prevSize + 1)
  }

  const handleDecreaseFontSize = () => {
    setFontSize((prevSize) => Math.max(1, prevSize - 1))
  }

  const handleColourThemeChange = (value: string) => {
    setColourTheme(value)
    localStorage.setItem("colourTheme", value)
  }

  const handleFontChange = (value: string) => {
    setSelectedFont(value)
    localStorage.setItem("selectedFont", value)
  }

  const handleOpenInstructions = () => {
    setIsInstructionsDialogOpen(true)
  }

  const handleSizeChange = (obsKey: keyof typeof obsSizes, size: string) => {
    const newSizes = { ...obsSizes, [obsKey]: size }
    setObsSizes(newSizes)
    localStorage.setItem("obsSizes", JSON.stringify(newSizes))
  }

  const getObsKey = (index: number): keyof typeof obsSizes => {
    return `obs${index}` as "obs" | "obs2" | "obs3" | "obs4" | "obs5"
  }

  const handleRadiusChange = (value: string) => {
    setCornerRadius(value)
    localStorage.setItem("cornerRadius", value)
  }

  return (
    <div className="absolute top-0 left-0 w-full max-w-[324px]">
      <Card className="w-full">
        <CardContent className="p-4 pt-1">
          <div className="space-y-4">
            <div className="flex flex-row space-x-2">
              <Input
                type="number"
                placeholder="Start Balance"
                value={startBalance}
                onChange={(e) => setStartBalance(e.target.value)}
                className={`w-1/2 ${noSpinnerClass}`}
              />
              <Input
                type="number"
                placeholder="End Balance"
                value={endBalance}
                onChange={(e) => setEndBalance(e.target.value)}
                className={`w-1/2 ${noSpinnerClass}`}
              />
            </div>
            <form onSubmit={handleAddSlot} className="flex flex-col space-y-2">
              <Input
                placeholder="Slot Name"
                value={newSlot.name}
                onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })}
              />
              <div className="flex space-x-2 items-center">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Bet Size"
                  value={newSlot.bet}
                  onChange={(e) => setNewSlot({ ...newSlot, bet: e.target.value })}
                  className={`flex-1 ${noSpinnerClass}`}
                />
                <div className="flex items-center space-x-1">
                  <Button
                    type="button"
                    onClick={() => setIsSuperBonus(!isSuperBonus)}
                    variant={isSuperBonus ? "default" : "outline"}
                    className="h-9 px-2 text-xs"
                  >
                    {isSuperBonus ? "Super ✓" : "Super"}
                  </Button>
                </div>
              </div>
              <Button type="submit">Add Slot</Button>
              <Button onClick={() => toggleMenu("slotList")} className="w-full mt-2">
                {activeMenu === "slotList" ? "Hide Slotlist" : "View Slotlist"}
              </Button>
              <Button onClick={() => toggleMenu("customise")} className="w-full mt-2">
                {activeMenu === "customise" ? "Hide Customise Menu" : "Customise OBS"}
              </Button>
              <Button onClick={() => toggleMenu("widgets")} className="w-full mt-2">
                {activeMenu === "widgets" ? "Hide Widgets Menu" : "Show Widgets Menu"}
              </Button>
              {activeMenu === "customise" && (
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <label htmlFor="colour-theme" className="block text-xs font-medium text-gray-700">
                        Theme
                      </label>
                      <Select value={colourTheme} onValueChange={handleColourThemeChange}>
                        <SelectTrigger id="colour-theme" className="w-full text-xs">
                          <SelectValue placeholder="Theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="red">Red</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="purple">Purple</SelectItem>
                          <SelectItem value="orange">Orange</SelectItem>
                          <SelectItem value="black">Black</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="font-select" className="block text-xs font-medium text-gray-700">
                        Font
                      </label>
                      <Select value={selectedFont} onValueChange={handleFontChange}>
                        <SelectTrigger id="font-select" className="w-full text-xs">
                          <SelectValue placeholder="Font" />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map((font) => (
                            <SelectItem key={font} value={font}>
                              {font}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="font-size" className="block text-xs font-medium text-gray-700">
                        Size
                      </label>
                      <div className="flex items-center space-x-1">
                        <Button onClick={handleDecreaseFontSize} variant="outline" size="icon" className="h-8 w-8">
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-medium w-8 text-center">{fontSize}</span>
                        <Button onClick={handleIncreaseFontSize} variant="outline" size="icon" className="h-8 w-8">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="corner-radius" className="block text-xs font-medium text-gray-700">
                      Corner Radius
                    </label>
                    <Select value={cornerRadius} onValueChange={handleRadiusChange}>
                      <SelectTrigger id="corner-radius" className="w-full text-xs">
                        <SelectValue placeholder="Radius" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">Square (0px)</SelectItem>
                        <SelectItem value="10px">Slight (10px)</SelectItem>
                        <SelectItem value="20px">Medium (20px)</SelectItem>
                        <SelectItem value="30px">Rounded (30px)</SelectItem>
                        <SelectItem value="40px">Very Rounded (40px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {["obs", "obs2", "obs3", "obs4", "obs5"].map((source) => (
                      <div key={source} className="flex items-center space-x-2">
                        <label htmlFor={`${source}-size`} className="w-16 text-xs font-medium text-gray-700">
                          {source.toUpperCase()}:
                        </label>
                        <Select
                          onValueChange={(value) => handleSizeChange(source as keyof typeof obsSizes, value)}
                          value={obsSizes[source as keyof typeof obsSizes]}
                        >
                          <SelectTrigger id={`${source}-size`} className="w-24 text-xs h-8">
                            <SelectValue placeholder="Size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="400px">400px</SelectItem>
                            <SelectItem value="600px">600px</SelectItem>
                            <SelectItem value="800px">800px</SelectItem>
                            {source !== "obs4" && <SelectItem value="1200px">1200px</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {["OBS 2", "OBS 3", "OBS 4", "OBS 5"].map((obs, index) => {
                      const obsKey = getObsKey(index + 2)
                      const isObs5 = obs === "OBS 5"
                      return (
                        <div key={obs} className="flex items-center space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={`/obs-${index + 2}?size=${obsSizes[obsKey]}${isObs5 ? `&radius=${cornerRadius}` : ""}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button className="w-full text-xs py-1 px-2">{obs}</Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Right click and select 'open in new tab'</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            onClick={() =>
                              copyToClipboard(
                                `http://huntmaster.vercel.app/obs-${index + 2}?size=${obsSizes[obsKey]}${isObs5 ? `&radius=${cornerRadius}` : ""}&user=${currentUsername}`,
                                `${obs} link copied to clipboard`,
                              )
                            }
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 copy-enabled"
                          >
                            <Clipboard className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}

                    {/* Add OBS 7 - Hunt Info Widget */}
                    <div className="flex items-center space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/obs-7?size=${obsSizes.obs5}&radius=${cornerRadius}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button className="w-full text-xs py-1 px-2">OBS 7</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/obs-7?size=${obsSizes.obs5}&radius=${cornerRadius}&user=${currentUsername}`,
                            `OBS 7 link copied to clipboard`,
                          )
                        }
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 copy-enabled"
                      >
                        <Clipboard className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Add OBS 8 - Slot List Widget */}
                    <div className="flex items-center space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/obs-8?size=${obsSizes.obs5}`} target="_blank" rel="noopener noreferrer">
                              <Button className="w-full text-xs py-1 px-2">OBS 8</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/obs-8?size=${obsSizes.obs5}&user=${currentUsername}`,
                            `OBS 8 link copied to clipboard`,
                          )
                        }
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 copy-enabled"
                      >
                        <Clipboard className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {activeMenu === "widgets" && (
                <div className="space-y-4 mt-2">
                  <div className="font-bold text-lg">Widgets</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/widgets/progress-bar" target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">Progress Bar</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/progress-bar?user=${currentUsername}`,
                            "Progress Bar link copied to clipboard",
                          )
                        }
                        variant="ghost"
                        size="icon"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/widgets/top-wins" target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">Top Wins</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/top-wins?user=${currentUsername}`,
                            "Top Wins link copied to clipboard",
                          )
                        }
                        variant="ghost"
                        size="icon"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/widgets/hunt-stats" target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">Hunt Stats</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/hunt-stats?user=${currentUsername}`,
                            "Hunt Stats link copied to clipboard",
                          )
                        }
                        variant="ghost"
                        size="icon"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/widgets/next-bonus" target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">Next Bonus</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/next-bonus?user=${currentUsername}`,
                            "Next Bonus link copied to clipboard",
                          )
                        }
                        variant="ghost"
                        size="icon"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/widgets/start-balance" target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">Start Balance</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/start-balance?user=${currentUsername}`,
                            "Start Balance link copied to clipboard",
                          )
                        }
                        variant="ghost"
                        size="icon"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/widgets/time-date" target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">Time & Date</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/time-date?user=${currentUsername}`,
                            "Time & Date widget link copied to clipboard",
                          )
                        }
                        variant="ghost"
                        size="icon"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Add the advanced time-date widget after the regular time-date widget */}
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href="/widgets/time-date-advanced?theme=neon"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button className="w-full">Time & Date Pro</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/time-date-advanced?theme=neon&user=${currentUsername}`,
                            "Advanced Time & Date widget link copied to clipboard",
                          )
                        }
                        variant="ghost"
                        size="icon"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/widgets/ars" target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">ARS Converter</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/ars?user=${currentUsername}`,
                            "ARS Converter widget link copied to clipboard",
                          )
                        }
                        variant="ghost"
                        size="icon"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </form>
            {activeMenu === "slotList" && (
              <div className="h-[300px] overflow-y-auto mt-2" ref={slotListRef}>
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Slot Name</TableHead>
                      <TableHead>Bet Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>{slot.name}</TableCell>
                        <TableCell>{slot.bet.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button onClick={() => handleEditSlot(slot)}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex flex-col space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/obs?size=${obsSizes.obs}`} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full">Open OBS Browser Source</Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Right click and select 'open in new tab'</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Link href="/collect-bonuses">
                <Button className="w-full">Collect Bonuses</Button>
              </Link>
              {isAdmin && (
                <Link href="/admin">
                  <Button className="w-full">Admin Dashboard</Button>
                </Link>
              )}
              <div className="flex justify-between items-center gap-2 mt-2">
                <Button
                  onClick={handleNewHunt}
                  className="flex-1 p-2 transition-all duration-200 active:scale-90"
                  variant="outline"
                >
                  <FileIcon className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleOpenInstructions}
                  className="flex-1 p-2 transition-all duration-200 active:scale-90"
                  variant="outline"
                >
                  <Info className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleCopyHuntDetails}
                  className="flex-1 p-2 transition-all duration-200 active:scale-90"
                  variant="outline"
                >
                  <Clipboard className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 p-2 transition-all duration-200 active:scale-90"
                  variant="outline"
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => {
                    localStorage.removeItem("huntmaster_session")
                    router.push("/")
                  }}
                  className="flex-1 p-2 transition-all duration-200 active:scale-90"
                  variant="outline"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
              {currentUsername && (
                <div className="mt-2 flex justify-center">
                  <span className="text-sm text-gray-400 font-medium">
                    Signed in as: {currentUsername}
                  </span>
                </div>
              )}
              <div className="mt-2 flex justify-center">
                <VersionHistory />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {isEditing && editingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-auto">
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Slot Name"
                  value={editingSlot.name}
                  onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  onChange={(e) => setEditingSlot({ ...editingSlot, bet: Number.parseFloat(e.target.value) })}
                  className={noSpinnerClass}
                />
                <div className="flex space-x-4">
                  <Button onClick={handleSaveEdit}>Save</Button>
                  <Button onClick={handleCancelEdit} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={openDeleteDialog} variant="destructive">
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent aria-describedby="delete-dialog-description">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription id="delete-dialog-description">
              Are you sure you want to delete '{editingSlot?.name}'?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsDeleteDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDeleteSlot} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSaveHuntDialogOpen} onOpenChange={setIsSaveHuntDialogOpen}>
        <DialogContent aria-describedby="save-hunt-dialog-description">
          <DialogHeader>
            <DialogTitle>Save Hunt</DialogTitle>
            <DialogDescription id="save-hunt-dialog-description">Enter a name for this hunt:</DialogDescription>
          </DialogHeader>
          <Input value={saveHuntName} onChange={(e) => setSaveHuntName(e.target.value)} placeholder="Hunt Name" />
          <DialogFooter>
            <Button onClick={() => setIsSaveHuntDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={confirmSaveHunt} variant="default">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isNewHuntDialogOpen} onOpenChange={setIsNewHuntDialogOpen}>
        <DialogContent aria-describedby="new-hunt-dialog-description">
          <DialogHeader>
            <DialogTitle>Start New Hunt</DialogTitle>
            <DialogDescription id="new-hunt-dialog-description">
              Are you sure you want to start a new hunt? All existing information will be cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsNewHuntDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={confirmNewHunt} variant="default">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isInstructionsDialogOpen} onOpenChange={(open) => setIsInstructionsDialogOpen(open)}>
        <DialogContent className="max-w-4xl" aria-describedby="instructions-dialog-description">
          <DialogHeader>
            <DialogTitle>How to Use the Bonus Hunt Software</DialogTitle>
          </DialogHeader>
          <div id="instructions-dialog-description" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
              <div className="font-bold">⚠️ Important Warning</div>
              <p>
                Always enter your hunt information using the OBS dock panel, not through a web browser. Information
                entered in a browser will not sync with your OBS browser sources.
              </p>
            </div>
            <p>Welcome to the Bonus Hunt Tracker! Here's how to use the software:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li className="mb-4">
                <strong>Set up the OBS Custom Dock (Important First Step):</strong>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>In OBS Studio, go to View → Docks → Custom Browser Docks</li>
                  <li>Enter "Huntmaster" as the dock name</li>
                  <li>Add the URL: https://huntmaster.vercel.app/</li>
                  <li>Position the dock vertically on the left or right side of your OBS window</li>
                  <li>Note: For best compatibility, use OBS Studio rather than Streamlabs OBS</li>
                </ul>
              </li>
              <li>Enter your starting balance and ending balance in the input fields at the top.</li>
              <li>Add slots by entering the slot name and bet size, then click "Add Slot".</li>
              <li>Use the "View Slotlist" button to see and edit your added slots.</li>
              <li>Customize OBS settings using the "Customise OBS" menu.</li>
              <li>Access widgets using the "Show Widgets Menu" button.</li>
              <li>
                <strong>Resizing OBS Sources:</strong>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>To resize an OBS source, use the size dropdown in the Customise OBS menu</li>
                  <li>After changing the size, click the clipboard icon next to the OBS button</li>
                  <li>In OBS Studio, right-click the existing browser source and select "Properties"</li>
                  <li>Replace the URL with the newly copied link that includes the updated size parameter</li>
                  <li>
                    Set the "Height" property in OBS to match your selected size (e.g., if you selected 600px, set
                    height to 600)
                  </li>
                  <li>
                    The "Width" property should remain at the default for that source:
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>OBS 1: 600px width</li>
                      <li>OBS 2: 400px width</li>
                      <li>OBS 3: 600px width</li>
                      <li>OBS 4: 520px width</li>
                      <li>OBS 5: 700px width</li>
                    </ul>
                  </li>
                  <li>Click "OK" to apply the changes</li>
                </ul>
              </li>
              <li>
                <strong>Time & Date Widgets:</strong>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    The Time & Date widget displays the current time and date with a clean, transparent background
                  </li>
                  <li>The Time & Date Pro widget offers customization options via URL parameters:</li>
                  <li className="ml-4">
                    Format: ?format=24 (for 24-hour time) or ?format=12 (for 12-hour time with AM/PM)
                  </li>
                  <li className="ml-4">Seconds: ?seconds=false to hide seconds</li>
                  <li className="ml-4">Date: ?date=false to hide the date</li>
                  <li className="ml-4">Theme: ?theme=neon, ?theme=sunset, ?theme=forest, or ?theme=purple</li>
                  <li className="ml-4">Size: ?size=small, ?size=medium, ?size=large, or ?size=xlarge</li>
                  <li className="ml-4">Example: /widgets/time-date-advanced?theme=neon&format=24&size=large</li>
                </ul>
              </li>
              <li>
                <strong>ARS Currency Converter:</strong>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>The ARS widget automatically converts your start balance from USD to ARS (Argentine Peso)</li>
                  <li>Uses a fixed exchange rate of 0.00094 (configurable in the code)</li>
                  <li>Updates in real-time as you change your start balance</li>
                  <li>Displays the converted amount with a $ prefix</li>
                  <li>Example: $1000 USD = $0.94 ARS</li>
                </ul>
              </li>
              <li>Use the "Collect Bonuses" button to enter win amounts for each bonus round.</li>
              <li>Copy hunt details using the clipboard button at the bottom.</li>
            </ol>
            <h3 className="text-lg font-semibold mt-4">Widget and Browser Source Links</h3>
            <p>Use these links to add widgets and browser sources to your stream:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <WidgetItem
                url="http://huntmaster.vercel.app/obs"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/main-obs-browser-source.png-2RlwuBNGOkYET3pIouxJq3YHoSPoZq.png"
              />
              <WidgetItem
                url="http://huntmaster.vercel.app/obs-2"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-2.png-k64OYIEnlEcLRCLPPk2CfJ9OcJruFQ.png"
              />
              <WidgetItem
                url="http://huntmaster.vercel.app/obs-3"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-3.png-9TCrvW2SagQQVoQ9FYu0ORCvoto50o.png"
              />
              <WidgetItem
                url="http://huntmaster.vercel.app/obs-4"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-4.png-FI75hlCjnnIRoPvTu7gpfJIUwob6DM.png"
              />
              <WidgetItem
                url="http://huntmaster.vercel.app/obs-5"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
              <WidgetItem
                url="http://huntmaster.vercel.app/widgets/progress-bar"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/progress-bar-widget.png-NDrWkJkNn45TPvyo7WZEQvoOcwT9qi.png"
              />
              <WidgetItem
                url="http://huntmaster.vercel.app/widgets/top-wins"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/top-wins-widget.png-AxXX4ovkJqoMC4sKZpwRxXTMeFBTJ7.png"
              />
              <WidgetItem
                url="http://huntmaster.vercel.app/widgets/hunt-stats"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/hunt-stats-widget.png-m4l9PjOT411kJqW9j52rQHMZUyoFZ9.png"
              />
              <WidgetItem
                url="http://huntmaster.vercel.app/widgets/start-balance"
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
            </div>
            <p className="mt-4">To use these in OBS Studio, add a Browser Source and paste the appropriate link.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInstructionsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isClipboardDialogOpen} onOpenChange={setIsClipboardDialogOpen}>
        <DialogContent aria-describedby="clipboard-dialog-description">
          <DialogHeader>
            <DialogTitle>Clipboard</DialogTitle>
            <DialogDescription id="clipboard-dialog-description">{clipboardDialogContent}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsClipboardDialogOpen(false)} variant="default">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
