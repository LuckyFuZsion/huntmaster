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
import { Clipboard, FileIcon, Plus, Minus, Info, LogOut, RefreshCw, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { decrypt } from "@/lib/protection"
import { useRouter } from "next/navigation"
// Add the import for VersionHistory
import { VersionHistory } from "@/components/version-history"
import SlotNameAutocomplete from "@/components/SlotNameAutocomplete"
import { useSupabaseSlots } from "@/lib/hooks/useSupabaseSlots"
import { useSupabaseUserSettings } from "@/lib/hooks/useSupabaseUserSettings"

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
      <p className="text-sm break-all">{url}</p>
    </div>
  )
}

export function BonusHuntTracker() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [newSlot, setNewSlot] = useState({ name: "", bet: "" })
  const [selectedGame, setSelectedGame] = useState<{ title: string; provider?: string } | null>(null)
  const [startBalance, setStartBalance] = useState("")
  const [endBalance, setEndBalance] = useState("")
  const [balanceSavedState, setBalanceSavedState] = useState<{ start?: boolean; end?: boolean }>({})
  const slotListRef = useRef<HTMLDivElement>(null)
  
  // Refs for settings saving with debouncing
  const savingSettingsRef = useRef(false)
  const lastSavedSettingsRef = useRef<string>("") // JSON string of last saved settings
  const saveSettingsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const settingsLoadedRef = useRef(false) // Track if settings have been loaded at least once
  const previousSettingsRef = useRef<{ startBalance?: string; endBalance?: string } | null>(null) // Track previous balance values
  const userEditingRef = useRef(false) // Track if user is actively editing (typing in input fields)
  const lastUserEditRef = useRef<{ startBalance?: string; endBalance?: string } | null>(null) // Track what user last typed
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [colourTheme, setColourTheme] = useState("") // No default - only from database
  const [isSlotListVisible, setIsSlotListVisible] = useState(false)
  const [selectedFont, setSelectedFont] = useState("") // No default - only from database
  const [isCustomiseMenuVisible, setIsCustomiseMenuVisible] = useState(false)
  const [isSaveHuntDialogOpen, setIsSaveHuntDialogOpen] = useState(false)
  const [saveHuntName, setSaveHuntName] = useState("")
  const [isNewHuntDialogOpen, setIsNewHuntDialogOpen] = useState(false)
  const [fontSize, setFontSize] = useState(0) // No default - only from database
  const [isWidgetsMenuVisible, setIsWidgetsMenuVisible] = useState(false)
  const [isInstructionsDialogOpen, setIsInstructionsDialogOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isClipboardDialogOpen, setIsClipboardDialogOpen] = useState(false)
  const [clipboardDialogContent, setClipboardDialogContent] = useState("")
  const [isExtensionTokenDialogOpen, setIsExtensionTokenDialogOpen] = useState(false)
  const [obsSizes, setObsSizes] = useState({
    obs: "600px",
    obs2: "600px",
    obs3: "600px",
    obs4: "300px",
    obs5: "600px",
  })
  const [isAdmin, setIsAdmin] = useState(false)
  const [cornerRadius, setCornerRadius] = useState("") // No default - only from database
  const [isSuperBonus, setIsSuperBonus] = useState(false)
  const [viewMode, setViewMode] = useState<"bonus-hunt" | "live-games">("bonus-hunt")
  
  // Live Games state
  const [liveGame, setLiveGame] = useState({ name: "", bet: "", win: "" })
  const [selectedLiveGame, setSelectedLiveGame] = useState<{ title: string; provider?: string } | null>(null)
  const [isRecordingWin, setIsRecordingWin] = useState(false)
  const [isUpdatingGame, setIsUpdatingGame] = useState(false)

  const noSpinnerClass =
    "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

  const router = useRouter()

  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [canEdit, setCanEdit] = useState(false) // Blocks editing until 2 seconds after load
  const [currentUsername, setCurrentUsername] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  // Get userId from session
  useEffect(() => {
    const session = localStorage.getItem("huntmaster_session")
    if (session) {
      try {
        const sessionData = JSON.parse(decrypt(session))
        setUserId(sessionData.userId || null)
        setIsAdmin(sessionData.isAdmin)
        setCurrentUsername(sessionData.username)
      } catch (err) {
        console.error("Error parsing session:", err)
        setUserId(null)
        setIsAdmin(false)
      }
    } else {
      setUserId(null)
    }
  }, [])

  // Use real-time subscriptions instead of polling
  const { slots: realtimeSlots, loading: slotsLoading, error: slotsError } = useSupabaseSlots(userId)
  const { settings, loading: settingsLoading } = useSupabaseUserSettings(userId)

  // Update slots state when real-time data changes
  useEffect(() => {
    if (realtimeSlots) {
      // Deduplicate slots by ID and name as a safeguard
      const mappedSlots = realtimeSlots.map((slot: any) => ({
        id: slot.id,
        name: slot.name,
        bet: slot.bet,
        win: slot.win,
      }))
      
      // Deduplicate by ID and name
      const seenIds = new Set<string>()
      const seenNames = new Map<string, typeof mappedSlots[0]>()
      const uniqueSlots = mappedSlots.filter((slot) => {
        // Check by ID
        if (seenIds.has(slot.id)) {
          console.log('Duplicate slot ID in tracker:', slot.id, slot.name)
          return false
        }
        seenIds.add(slot.id)
        
        // Check by name (case-insensitive)
        const nameKey = slot.name.toLowerCase().trim()
        if (seenNames.has(nameKey)) {
          console.log('Duplicate slot name in tracker:', slot.name)
          return false
        }
        seenNames.set(nameKey, slot)
        
        return true
      })
      
      if (uniqueSlots.length !== mappedSlots.length) {
        console.log(`Deduplicated in tracker: ${mappedSlots.length} -> ${uniqueSlots.length} slots`)
      }
      
      setSlots(uniqueSlots)
      if (!initialLoadComplete) {
        setInitialLoadComplete(true)
        // Wait 2 seconds after initial load before allowing edits
        setTimeout(() => {
          setCanEdit(true)
          console.log("Initial load complete - editing now enabled")
        }, 2000)
      }
    } else if (!slotsLoading && initialLoadComplete === false) {
      // Mark as complete even if no slots (empty state)
      setSlots([])
      setInitialLoadComplete(true)
      // Wait 2 seconds after initial load before allowing edits
      setTimeout(() => {
        setCanEdit(true)
        console.log("Initial load complete (no slots) - editing now enabled")
      }, 2000)
    }

    // Check for quota errors
    if (slotsError && slotsError.message?.includes("quota")) {
      console.error("Database quota exceeded:", slotsError.message)
      alert("Database quota exceeded. Please check your Supabase plan or wait for quota reset.")
    }
  }, [realtimeSlots, slotsLoading, slotsError, initialLoadComplete])

  // Update settings state when real-time data changes
  useEffect(() => {
    if (settings) {
      console.log("Loaded settings from database:", settings)
      
      // DASHBOARD PROTECTION: If user is actively editing, ignore real-time updates for balances
      // The dashboard is read-write for the logged-in user - external changes shouldn't overwrite user input
      if (userEditingRef.current && lastUserEditRef.current) {
        // User is editing - preserve their current input, ignore real-time update
        console.log("User is editing, ignoring real-time balance update to preserve user input")
        // Only update other settings (theme, font, etc.) but keep balances as user typed them
        const protectedStartBalance = lastUserEditRef.current.startBalance || startBalance
        const protectedEndBalance = lastUserEditRef.current.endBalance || endBalance
        
        // Update other settings but preserve user's balance input
        // Only set values from database, no defaults
        if (settings.colourTheme) setColourTheme(settings.colourTheme)
        if (settings.selectedFont) setSelectedFont(settings.selectedFont)
        if (settings.fontSize) setFontSize(settings.fontSize)
        if (settings.cornerRadius) setCornerRadius(settings.cornerRadius)
        
        // Don't update balances - user is editing them
        previousSettingsRef.current = {
          startBalance: protectedStartBalance,
          endBalance: protectedEndBalance
        }
        
        // Update lastSavedSettingsRef to match current user input (will be saved when they finish)
        const loadedSettingsJson = JSON.stringify({
          colourTheme: settings.colourTheme || "blue",
          selectedFont: settings.selectedFont || "Arial",
          fontSize: settings.fontSize || 24,
          cornerRadius: settings.cornerRadius || "20px",
          startBalance: protectedStartBalance,
          endBalance: protectedEndBalance,
        })
        lastSavedSettingsRef.current = loadedSettingsJson
        
        return // Don't update balances while user is editing
      }
      
      // PROTECTION: Only preserve values if:
      // 1. We're past initial load (canEdit = true means we've loaded and displayed values)
      // 2. We previously had a value
      // 3. The new update explicitly has null/empty (not just missing from payload)
      // This prevents false positives during initial load when state might be empty
      let protectedStartBalance = settings.startBalance
      let protectedEndBalance = settings.endBalance
      
      // Only apply protection after initial load is complete and editing is enabled
      // Before that, trust the database completely
      if (canEdit && initialLoadComplete && previousSettingsRef.current) {
        const prevHadStart = previousSettingsRef.current.startBalance != null && previousSettingsRef.current.startBalance !== ""
        const prevHadEnd = previousSettingsRef.current.endBalance != null && previousSettingsRef.current.endBalance !== ""
        
        // Check if the new settings explicitly have null/empty (not just undefined)
        // If the field exists in the settings object but is null/empty, it's an explicit clear
        const hasStartBalanceField = Object.prototype.hasOwnProperty.call(settings, 'startBalance')
        const hasEndBalanceField = Object.prototype.hasOwnProperty.call(settings, 'endBalance')
        const currStartEmpty = hasStartBalanceField && (settings.startBalance == null || settings.startBalance === "")
        const currEndEmpty = hasEndBalanceField && (settings.endBalance == null || settings.endBalance === "")
        
        // Only protect if: we had a value AND the update explicitly tries to clear it
        // Don't protect if the field is just missing from the update (partial update)
        if (prevHadStart && currStartEmpty) {
          console.warn("Real-time update tried to clear startBalance, preserving previous value:", previousSettingsRef.current.startBalance)
          protectedStartBalance = previousSettingsRef.current.startBalance
        }
        if (prevHadEnd && currEndEmpty) {
          console.warn("Real-time update tried to clear endBalance, preserving previous value:", previousSettingsRef.current.endBalance)
          protectedEndBalance = previousSettingsRef.current.endBalance
        }
      }
      
      // Preserve balance values from database exactly as they are (or protected values)
      // Important: "0" is a valid value, don't filter it out!
      // Convert null/undefined to empty string only if we don't have an existing value
      // Otherwise preserve existing state to prevent clearing on page load
      const loadedStartBalance = protectedStartBalance != null && protectedStartBalance !== "" 
        ? String(protectedStartBalance) 
        : (startBalance || "") // Preserve existing state if database value is null/empty
      const loadedEndBalance = protectedEndBalance != null && protectedEndBalance !== "" 
        ? String(protectedEndBalance) 
        : (endBalance || "") // Preserve existing state if database value is null/empty
      
      // Only update previous settings reference AFTER initial load is complete
      // This prevents false protection triggers during initial load
      // On page refresh, previousSettingsRef starts as null, so we trust the database
      if (canEdit && initialLoadComplete) {
        // Only set previousSettingsRef if we actually have values to protect
        // Don't store empty strings as "previous" values
        if (loadedStartBalance || loadedEndBalance) {
          previousSettingsRef.current = {
            startBalance: loadedStartBalance,
            endBalance: loadedEndBalance
          }
        }
      }
      
      console.log("Setting balances from loaded settings:", { 
        rawStartBalance: settings.startBalance,
        protectedStartBalance,
        rawEndBalance: settings.endBalance,
        protectedEndBalance,
        loadedStartBalance, 
        loadedEndBalance,
        currentStartBalance: startBalance,
        currentEndBalance: endBalance,
        startBalanceType: typeof settings.startBalance,
        endBalanceType: typeof settings.endBalance
      })
      
      // CRITICAL: Update lastSavedSettingsRef BEFORE updating state
      // This prevents the save effect from seeing a "change" when settings load
      // Use only values from database, no defaults
      const loadedSettingsJson = JSON.stringify({
        colourTheme: settings.colourTheme || "",
        selectedFont: settings.selectedFont || "",
        fontSize: settings.fontSize || 0,
        cornerRadius: settings.cornerRadius || "",
        startBalance: loadedStartBalance,
        endBalance: loadedEndBalance,
      })
      lastSavedSettingsRef.current = loadedSettingsJson
      settingsLoadedRef.current = true
      console.log("Settings loaded from database, waiting for canEdit before displaying. Loaded values:", {
        loadedStartBalance,
        loadedEndBalance,
        colourTheme: settings.colourTheme,
        selectedFont: settings.selectedFont,
        fontSize: settings.fontSize,
        cornerRadius: settings.cornerRadius,
        initialLoadComplete,
        canEdit
      })
      
      // Settings will be applied when canEdit becomes true (see useEffect below)
      // Do NOT apply settings here - wait for 2 second delay
    } else if (!settingsLoading && !settingsLoadedRef.current) {
      // No settings found in database - initialize with empty values
      // Do NOT prepopulate with defaults - only use what's in database
      const emptySettingsJson = JSON.stringify({
        colourTheme: "",
        selectedFont: "",
        fontSize: 0,
        cornerRadius: "",
        startBalance: "",
        endBalance: "",
      })
      lastSavedSettingsRef.current = emptySettingsJson
      settingsLoadedRef.current = true
      console.log("No settings found in database, initialized with empty values - waiting for database data only")
    }
  }, [settings, settingsLoading, initialLoadComplete, canEdit]) // Depend on canEdit to apply settings when ready

  // Apply loaded settings when canEdit becomes true
  useEffect(() => {
    if (canEdit && initialLoadComplete && settings && settingsLoadedRef.current) {
      console.log("canEdit is now true - applying loaded settings from database")
      // Only update balances if user is not currently editing
      if (!userEditingRef.current) {
        // Only update if database has a non-null, non-empty value
        // Preserve existing state if database value is null/undefined/empty
        if (settings.startBalance != null && settings.startBalance !== "") {
          const loadedStartBalance = String(settings.startBalance)
          setStartBalance(loadedStartBalance)
          console.log("Updated startBalance from database:", loadedStartBalance)
        } else {
          console.log("Database startBalance is null/empty, preserving existing state:", startBalance)
        }
        
        if (settings.endBalance != null && settings.endBalance !== "") {
          const loadedEndBalance = String(settings.endBalance)
          setEndBalance(loadedEndBalance)
          console.log("Updated endBalance from database:", loadedEndBalance)
        } else {
          console.log("Database endBalance is null/empty, preserving existing state:", endBalance)
        }
        
        // Initialize previousSettingsRef ONLY when we first apply values after canEdit is true
        // This establishes the baseline for protection, but only after initial load
        if (!previousSettingsRef.current) {
          const currentStart = settings.startBalance != null && settings.startBalance !== "" 
            ? String(settings.startBalance) 
            : startBalance || ""
          const currentEnd = settings.endBalance != null && settings.endBalance !== "" 
            ? String(settings.endBalance) 
            : endBalance || ""
          previousSettingsRef.current = {
            startBalance: currentStart,
            endBalance: currentEnd
          }
          console.log("Initialized previousSettingsRef with database values after canEdit enabled:", previousSettingsRef.current)
        }
      }
      // Only set values from database - no defaults, no prepopulating
      if (settings.colourTheme) setColourTheme(settings.colourTheme)
      if (settings.selectedFont) setSelectedFont(settings.selectedFont)
      if (settings.fontSize) setFontSize(settings.fontSize)
      if (settings.cornerRadius) setCornerRadius(settings.cornerRadius)
    }
  }, [canEdit, initialLoadComplete, settings, startBalance, endBalance])

  useEffect(() => {
    const savedSizes = localStorage.getItem("obsSizes")
    if (savedSizes) {
      setObsSizes(JSON.parse(savedSizes))
    }
  }, [])

  // Save slots to database whenever they change (but not on initial load)
  // Use refs to prevent loops and debounce saves
  const savingRef = useRef(false)
  const lastSavedSlotsRef = useRef<string>("") // JSON string of last saved slots
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (!initialLoadComplete) {
      return // Don't save during initial load
    }
    
    // Deduplicate slots before comparing/saving
    const seenIds = new Set<string>()
    const seenNames = new Map<string, Slot>()
    const uniqueSlots = slots.filter((slot) => {
      if (seenIds.has(slot.id)) return false
      seenIds.add(slot.id)
      const nameKey = slot.name.toLowerCase().trim()
      if (seenNames.has(nameKey)) return false
      seenNames.set(nameKey, slot)
      return true
    })
    
    // Only save if slots actually changed (by comparing JSON)
    const currentSlotsJson = JSON.stringify(uniqueSlots.map(s => ({ id: s.id, name: s.name, bet: s.bet, win: s.win })))
    if (currentSlotsJson === lastSavedSlotsRef.current) {
      return // No changes, skip save
    }

    if (savingRef.current) {
      return // Already saving, skip to prevent loops
    }

    // Debounce saves - wait 1 second after last change before saving
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const saveSlotsToFirestore = async () => {
        savingRef.current = true
        try {
          const session = localStorage.getItem("huntmaster_session")
          if (!session) {
            console.warn("No session found, cannot save slots")
            savingRef.current = false
            return
          }
          
          // Only save if we have slots (prevent accidental deletion of all data)
          if (uniqueSlots.length > 0) {
            console.log("Saving slots to database:", uniqueSlots.length, "unique slots")
            
            const response = await fetch("/api/slots", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ session, action: "save", slots: uniqueSlots }),
            })
            
            if (!response.ok) {
              console.error("Failed to save slots. Status:", response.status)
              savingRef.current = false
              return
            }
            
            const data = await response.json()
            
            // Check for quota errors
            if (!data.success && data.error && (data.error.includes("quota") || data.error.includes("resource exhausted"))) {
              console.error("Database quota exceeded:", data.error)
              alert("Database quota exceeded. Unable to save. Please check your Supabase plan.")
              savingRef.current = false
              return
            }
            
            // Update last saved reference
            if (data.success && data.slots) {
              lastSavedSlotsRef.current = JSON.stringify(data.slots.map((s: any) => ({ id: s.id, name: s.name, bet: s.bet, win: s.win })))
              
              // Only update state if there are actual differences (temporary IDs or count change)
              const hasTempIds = uniqueSlots.some(slot => slot.id.length <= 15)
              const slotCountChanged = data.slots.length !== uniqueSlots.length
              if (hasTempIds || slotCountChanged) {
                // Deduplicate before setting state
                const seen = new Set<string>()
                const deduplicated = data.slots.filter((slot: any) => {
                  if (seen.has(slot.id)) return false
                  seen.add(slot.id)
                  return true
                }).map((slot: any) => ({
                  id: slot.id,
                  name: slot.name,
                  bet: slot.bet,
                  win: slot.win,
                }))
                setSlots(deduplicated)
              }
            }
          }
        } catch (error) {
          console.error("Error saving slots:", error)
        } finally {
          savingRef.current = false
        }
      }

      saveSlotsToFirestore()
    }, 1000) // Wait 1 second after last change
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [slots, initialLoadComplete])

  // Save settings to database with debouncing and change detection
  useEffect(() => {
    // Don't save if:
    // 1. Initial load not complete
    // 2. Settings still loading
    // 3. Settings haven't been loaded at least once (prevents saving empty values before load)
    if (!initialLoadComplete || settingsLoading || !settingsLoadedRef.current) {
      console.log("Skipping save - waiting for settings to load:", {
        initialLoadComplete,
        settingsLoading,
        settingsLoaded: settingsLoadedRef.current
      })
      return // Don't save during initial load, while loading, or before first load completes
    }

    // Build settings payload - only include values that exist (from database)
    // Don't save empty defaults - only save what user actually set or what came from database
    // NOTE: Balances are NOT auto-saved - they must be saved manually via tick button
    const settingsToSave: Record<string, any> = {}
    if (colourTheme) settingsToSave.colourTheme = colourTheme
    if (selectedFont) settingsToSave.selectedFont = selectedFont
    if (fontSize) settingsToSave.fontSize = fontSize
    if (cornerRadius) settingsToSave.cornerRadius = cornerRadius
    
    // Balances are NOT included in auto-save - they must be saved manually via tick button

    // Only save if settings actually changed (by comparing JSON)
    const currentSettingsJson = JSON.stringify(settingsToSave)
    if (currentSettingsJson === lastSavedSettingsRef.current) {
      console.log("Settings unchanged, skipping save")
      return // No changes, skip save
    }
    
    console.log("Settings changed, preparing to save:", {
      current: settingsToSave,
      lastSaved: lastSavedSettingsRef.current ? JSON.parse(lastSavedSettingsRef.current) : "none"
    })

    if (savingSettingsRef.current) {
      return // Already saving, skip to prevent loops
    }

    // Debounce saves - wait 1 second after last change before saving
    if (saveSettingsTimeoutRef.current) {
      clearTimeout(saveSettingsTimeoutRef.current)
    }
    
    saveSettingsTimeoutRef.current = setTimeout(() => {
      const saveSettingsToDatabase = async () => {
        savingSettingsRef.current = true
        try {
          const session = localStorage.getItem("huntmaster_session")
          if (!session) {
            console.warn("No session found, cannot save settings")
            savingSettingsRef.current = false
            return
          }
          
          console.log("Saving settings to database:", settingsToSave)
          
          const response = await fetch("/api/user-settings", {
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
          
          if (!response.ok) {
            console.error("Failed to save settings. Status:", response.status)
            const errorText = await response.text()
            console.error("Error response:", errorText)
            savingSettingsRef.current = false
            return
          }
          
          const data = await response.json()
          
          // Check for quota errors
          if (!data.success && data.error && (data.error.includes("quota") || data.error.includes("resource exhausted"))) {
            console.error("Database quota exceeded:", data.error)
            alert("Database quota exceeded. Unable to save settings. Please check your Supabase plan.")
            savingSettingsRef.current = false
            return
          }
          
          // Update last saved reference on success
          if (data.success) {
            lastSavedSettingsRef.current = currentSettingsJson
            // NOTE: Balances are NOT updated here - they are only saved via tick button
            console.log("Settings saved successfully by dashboard user:", settingsToSave)
            if (data.settings) {
              console.log("Verified saved settings from DB:", data.settings)
            }
          } else {
            console.error("Settings save failed:", data.error)
            alert(`Failed to save settings: ${data.error || "Unknown error"}`)
          }
        } catch (error) {
          console.error("Error saving settings:", error)
        } finally {
          savingSettingsRef.current = false
        }
      }

      saveSettingsToDatabase()
    }, 1000) // Wait 1 second after last change
    
    // Save immediately when component unmounts (navigation away) to ensure changes are saved
    // NOTE: Balances are NOT saved on unmount - they must be saved manually via tick button
    return () => {
      if (saveSettingsTimeoutRef.current) {
        // Clear the timeout
        clearTimeout(saveSettingsTimeoutRef.current)
        saveSettingsTimeoutRef.current = null
        
        // If there are unsaved changes and we're not already saving, save them now
        // EXCLUDE balances - they are only saved via tick button, never auto-saved
        const currentSettings: Record<string, any> = {
          colourTheme,
          selectedFont,
          fontSize,
          cornerRadius,
          // startBalance and endBalance are INTENTIONALLY excluded - only saved via tick button
        }
        const currentJson = JSON.stringify(currentSettings)
        
        if (savingSettingsRef.current === false && currentJson !== lastSavedSettingsRef.current) {
          const session = localStorage.getItem("huntmaster_session")
          if (session) {
            console.log("Saving pending settings on unmount (excluding balances):", currentSettings)
            // Fire and forget - try to save before unmount
            fetch("/api/user-settings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                session,
                action: "save",
                settings: currentSettings,
              }),
            }).catch(err => console.error("Error saving on unmount:", err))
          }
        }
      }
    }
  }, [colourTheme, selectedFont, fontSize, cornerRadius, initialLoadComplete, settingsLoading])

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) {
      console.log("Editing disabled - waiting for initial load to complete")
      return
    }
    if (newSlot.name && newSlot.bet) {
      // If super bonus is checked, append "(S)" to the slot name
      const slotName = isSuperBonus ? `${newSlot.name} (S)` : newSlot.name

      setSlots([
        ...slots,
        { id: Date.now().toString(), name: slotName, bet: Number.parseFloat(newSlot.bet), win: null },
      ])
      setNewSlot({ name: "", bet: "" })
      setSelectedGame(null) // Clear selected game after adding slot
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
      
      // Explicitly save to database to ensure deletion persists
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
    // Clear all hunt-related data from database for this user
    try {
      const session = localStorage.getItem("huntmaster_session")
      if (session) {
        // Clear slots from database
        await fetch("/api/slots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session, action: "save", slots: [] }),
        })
        
        // Clear balances in settings (keep other preferences)
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
        
        // Clear current game ("now playing")
        await fetch("/api/current-game/set", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session,
            gameTitle: "",
            provider: "",
          }),
        })
        
        console.log("Successfully cleared all hunt data: slots, balances, and current game")
      }
    } catch (error) {
      console.error("Error clearing hunt data:", error)
      alert("Error clearing hunt data. Please try again.")
      return
    }
    
    // Clear local state
    setSlots([])
    setStartBalance("")
    setEndBalance("")
    setNewSlot({ name: "", bet: "" })
    
    // Save empty balances to database
    const session = localStorage.getItem("huntmaster_session")
    if (session) {
      fetch("/api/user-settings", {
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
          },
        }),
      }).catch((error) => {
        console.error("Error clearing balances:", error)
      })
    }
    
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
    // Settings saved to database automatically via debounced save effect
  }

  const handleFontChange = (value: string) => {
    setSelectedFont(value)
    // Settings saved to database automatically via debounced save effect
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
    // Settings saved to database automatically via debounced save effect
  }

  // Function to save balances when tick button is clicked
  const handleSaveBalance = async (balanceType: "start" | "end") => {
    if (!canEdit) return
    
    const session = localStorage.getItem("huntmaster_session")
    if (!session) {
      alert("No session found. Please log in again.")
      return
    }
    
    const settingsToSave: Record<string, any> = {}
    // Always send a string value (never null/undefined) - empty string is valid to clear
    if (balanceType === "start") {
      const value = startBalance ?? ""
      // Ensure we never send null - convert to empty string
      settingsToSave.startBalance = value === null ? "" : String(value)
    } else {
      const value = endBalance ?? ""
      // Ensure we never send null - convert to empty string
      settingsToSave.endBalance = value === null ? "" : String(value)
    }
    
    try {
      const response = await fetch("/api/user-settings", {
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
      
      if (!response.ok) {
        throw new Error("Failed to save balance")
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Update previous settings ref to match what we just saved
        if (!previousSettingsRef.current) {
          previousSettingsRef.current = {}
        }
        if (balanceType === "start") {
          previousSettingsRef.current.startBalance = startBalance || ""
          setBalanceSavedState({ ...balanceSavedState, start: true })
          // Reset green state after 2 seconds
          setTimeout(() => {
            setBalanceSavedState((prev) => ({ ...prev, start: false }))
          }, 2000)
        } else {
          previousSettingsRef.current.endBalance = endBalance || ""
          setBalanceSavedState({ ...balanceSavedState, end: true })
          // Reset green state after 2 seconds
          setTimeout(() => {
            setBalanceSavedState((prev) => ({ ...prev, end: false }))
          }, 2000)
        }
        console.log(`Balance saved successfully:`, balanceType, settingsToSave)
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (error) {
      console.error(`Error saving ${balanceType} balance:`, error)
      alert(`Failed to save ${balanceType === "start" ? "start" : "end"} balance. Please try again.`)
    }
  }

  // Live Games handlers
  const handleUpdateNowPlaying = async () => {
    if (!selectedLiveGame) return
    
    const session = localStorage.getItem("huntmaster_session")
    if (!session) {
      alert("Please log in first")
      return
    }
    
    setIsUpdatingGame(true)
    try {
      const response = await fetch("/api/current-game/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          gameTitle: selectedLiveGame.title.trim(),
          provider: selectedLiveGame.provider?.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (data.success) {
        alert(`✓ Now Playing updated to: ${selectedLiveGame.title}`)
      } else {
        alert(`Failed to update: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error updating current game:", error)
      alert("Failed to update current game. Please try again.")
    } finally {
      setIsUpdatingGame(false)
    }
  }

  const handleRecordLiveWin = async () => {
    if (!liveGame.name || !liveGame.bet || !liveGame.win) {
      alert("Please fill in game name, stake, and win amount")
      return
    }

    const session = localStorage.getItem("huntmaster_session")
    if (!session) {
      alert("Please log in first")
      return
    }

    const bet = parseFloat(liveGame.bet)
    const winAmount = parseFloat(liveGame.win)

    if (isNaN(bet) || bet < 0 || isNaN(winAmount) || winAmount < 0) {
      alert("Please enter valid numbers for stake and win")
      return
    }

    setIsRecordingWin(true)
    try {
      // Record the win
      const recordResponse = await fetch("/api/user-wins/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session,
          gameTitle: liveGame.name.trim(),
          bet: bet,
          winAmount: winAmount,
          provider: selectedLiveGame?.provider?.trim() || undefined,
        }),
      })

      const recordData = await recordResponse.json()

      if (!recordData.success) {
        alert(`Failed to record win: ${recordData.error || "Unknown error"}`)
        return
      }

      // Update current game to extension
      if (selectedLiveGame) {
        const updateResponse = await fetch("/api/current-game/set", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session,
            gameTitle: selectedLiveGame.title.trim(),
            provider: selectedLiveGame.provider?.trim() || undefined,
          }),
        })
        await updateResponse.json() // Don't block on this
      }

      // Clear win amount, keep game and stake
      setLiveGame({ ...liveGame, win: "" })
      alert(`Win recorded! ${winAmount} (${bet > 0 ? (winAmount / bet).toFixed(2) : "0"}x)`)
    } catch (error) {
      console.error("Error recording win:", error)
      alert("Failed to record win. Please try again.")
    } finally {
      setIsRecordingWin(false)
    }
  }

  return (
    <div className="absolute top-0 left-0 w-full max-w-[324px]">
      <Card className="w-full">
        <CardContent className="p-4 pt-1">
          <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant={viewMode === "bonus-hunt" ? "default" : "outline"}
                onClick={() => setViewMode("bonus-hunt")}
                className="flex-1"
              >
                Bonus Hunt
              </Button>
              <Button
                type="button"
                variant={viewMode === "live-games" ? "default" : "outline"}
                onClick={() => setViewMode("live-games")}
                className="flex-1"
              >
                Live Games
              </Button>
            </div>

            {viewMode === "bonus-hunt" ? (
              <>
            <div className="flex flex-row space-x-2">
              <div className="flex flex-row space-x-1 w-1/2">
                <Input
                  type="number"
                  placeholder="Start Balance"
                  value={startBalance}
                  disabled={!canEdit}
                  onChange={(e) => {
                    if (canEdit) {
                      const val = e.target.value
                      setStartBalance(val)
                    }
                  }}
                  className={`flex-1 ${noSpinnerClass}`}
                />
                <Button
                  type="button"
                  variant={balanceSavedState.start ? "default" : "outline"}
                  size="icon"
                  onClick={() => handleSaveBalance("start")}
                  disabled={!canEdit}
                  className={`h-10 w-10 flex-shrink-0 ${
                    balanceSavedState.start ? "bg-green-600 hover:bg-green-700 text-white" : ""
                  }`}
                  title="Save start balance"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-row space-x-1 w-1/2">
                <Input
                  type="number"
                  placeholder="End Balance"
                  value={endBalance}
                  disabled={!canEdit}
                  onChange={(e) => {
                    if (canEdit) {
                      const val = e.target.value
                      setEndBalance(val === "" ? "" : val)
                    }
                  }}
                  className={`flex-1 ${noSpinnerClass}`}
                />
                <Button
                  type="button"
                  variant={balanceSavedState.end ? "default" : "outline"}
                  size="icon"
                  onClick={() => handleSaveBalance("end")}
                  disabled={!canEdit}
                  className={`h-10 w-10 flex-shrink-0 ${
                    balanceSavedState.end ? "bg-green-600 hover:bg-green-700 text-white" : ""
                  }`}
                  title="Save end balance"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <form onSubmit={handleAddSlot} className="flex flex-col space-y-2">
              <SlotNameAutocomplete
                value={newSlot.name}
                disabled={!canEdit}
                onChange={(v) => {
                  if (canEdit) {
                    setNewSlot({ ...newSlot, name: v })
                    // Clear selected game if user manually types
                    if (!v) setSelectedGame(null)
                  }
                }}
                onSelect={(item) => {
                  if (canEdit) {
                    setNewSlot({ ...newSlot, name: item.title })
                    // Store the selected game with provider for updating current game
                    setSelectedGame({ title: item.title, provider: item.provider })
                  }
                }}
                placeholder="Slot Name"
              />
              <div className="flex space-x-2 items-center">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Bet Size"
                  value={newSlot.bet}
                  disabled={!canEdit}
                  onChange={(e) => {
                    if (canEdit) {
                      setNewSlot({ ...newSlot, bet: e.target.value })
                    }
                  }}
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
              <Button type="submit" className="w-full">Add Slot</Button>
              <Button onClick={() => toggleMenu("slotList")} className="w-full mt-2">
                {activeMenu === "slotList" ? "Hide Slotlist" : "View Slotlist"}
              </Button>
              <Button onClick={() => toggleMenu("customise")} className="w-full mt-2">
                {activeMenu === "customise" ? "Hide OBS Overlays" : "OBS Overlays"}
              </Button>
              <Button onClick={() => toggleMenu("widgets")} className="w-full mt-2">
                {activeMenu === "widgets" ? "Hide Widgets Menu" : "Show Widgets Menu"}
              </Button>
              {activeMenu === "customise" && (
                <div className="space-y-4 mt-2">
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
                            <Link href={`/widgets/now-playing?user=${currentUsername}&source=extension`} target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">Now Playing (Extension)</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Shows game from browser extension. Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/now-playing?user=${currentUsername}&source=extension`,
                            "Extension Now Playing widget link copied to clipboard",
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
                            <Link href={`/widgets/now-playing?user=${currentUsername}&source=hunt`} target="_blank" rel="noopener noreferrer">
                              <Button className="w-full">Now Playing (Bonus Hunt)</Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Shows next game from active bonus hunt. Right click and select 'open in new tab'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            `http://huntmaster.vercel.app/widgets/now-playing?user=${currentUsername}&source=hunt`,
                            "Bonus Hunt Now Playing widget link copied to clipboard",
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
              <Link href="/spider-edit">
                <Button className="w-full">Customisable Overlay</Button>
              </Link>
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
          </>
            ) : (
              <>
                {/* Live Games View */}
                <div className="flex flex-col space-y-2">
                  <SlotNameAutocomplete
                    value={liveGame.name}
                    onChange={(v) => {
                      setLiveGame({ ...liveGame, name: v })
                      if (!v) setSelectedLiveGame(null)
                    }}
                    onSelect={(item) => {
                      setLiveGame({ ...liveGame, name: item.title })
                      setSelectedLiveGame({ title: item.title, provider: item.provider })
                    }}
                    placeholder="Game Name"
                  />
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Stake"
                      value={liveGame.bet}
                      onChange={(e) => setLiveGame({ ...liveGame, bet: e.target.value })}
                      className={`flex-1 ${noSpinnerClass}`}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Win Amount"
                      value={liveGame.win}
                      onChange={(e) => setLiveGame({ ...liveGame, win: e.target.value })}
                      className={`flex-1 ${noSpinnerClass}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRecordLiveWin}
                      disabled={isRecordingWin || !liveGame.name || !liveGame.bet || !liveGame.win}
                      className="flex-1"
                    >
                      {isRecordingWin ? "Recording..." : "💰 Record Win"}
                    </Button>
                    {selectedLiveGame && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUpdateNowPlaying}
                        disabled={isUpdatingGame || !selectedLiveGame}
                        className="flex-1"
                      >
                        {isUpdatingGame ? "Updating..." : "Update Now Playing"}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/widgets/now-playing?user=${currentUsername}&source=extension`} target="_blank" rel="noopener noreferrer">
                            <Button className="w-full">Now Playing Widget</Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Shows game from browser extension. Right click and select 'open in new tab'</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      onClick={() =>
                        copyToClipboard(
                          `http://huntmaster.vercel.app/widgets/now-playing?user=${currentUsername}&source=extension`,
                          "Extension Now Playing widget link copied to clipboard",
                        )
                      }
                      variant="ghost"
                      size="icon"
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      const session = localStorage.getItem("huntmaster_session")
                      if (session) {
                        copyToClipboard(session, "Session token copied to clipboard!")
                        setIsExtensionTokenDialogOpen(true)
                      } else {
                        alert("No session found. Please log in first.")
                      }
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    Copy ID for Browser Extension
                  </Button>
                  {isAdmin && (
                    <Link href="/admin">
                      <Button className="w-full">Admin Dashboard</Button>
                    </Link>
                  )}
                  <div className="flex justify-between items-center gap-2 mt-2">
                    <Button
                      onClick={handleOpenInstructions}
                      className="flex-1 p-2 transition-all duration-200 active:scale-90"
                      variant="outline"
                    >
                      <Info className="w-5 h-5" />
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
              </>
            )}
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
              <li>Use the "Collect Bonuses" button to enter win amounts for each bonus round.</li>
              <li>Copy hunt details using the clipboard button at the bottom.</li>
            </ol>
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
              <div className="font-bold">📌 Personalized URLs</div>
              <p className="mt-1">
                Each user has their own personalized overlay and widget URLs. The URLs below are specifically for{" "}
                <strong>{currentUsername || "your account"}</strong>. Each user's data is isolated, so your overlays will only show your hunt information.
              </p>
            </div>
            <h3 className="text-lg font-semibold mt-4">Widget and Browser Source Links</h3>
            <p>Use these personalized links to add widgets and browser sources to your stream:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <WidgetItem
                url={`http://huntmaster.vercel.app/obs?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/main-obs-browser-source.png-2RlwuBNGOkYET3pIouxJq3YHoSPoZq.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/obs-2?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-2.png-k64OYIEnlEcLRCLPPk2CfJ9OcJruFQ.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/obs-3?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-3.png-9TCrvW2SagQQVoQ9FYu0ORCvoto50o.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/obs-4?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-4.png-FI75hlCjnnIRoPvTu7gpfJIUwob6DM.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/obs-5?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/obs-7?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/obs-8?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/spider?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/obs-browser-source-5.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/widgets/progress-bar?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/progress-bar-widget.png-NDrWkJkNn45TPvyo7WZEQvoOcwT9qi.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/widgets/top-wins?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/top-wins-widget.png-AxXX4ovkJqoMC4sKZpwRxXTMeFBTJ7.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/widgets/hunt-stats?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/hunt-stats-widget.png-m4l9PjOT411kJqW9j52rQHMZUyoFZ9.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/widgets/next-bonus?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/widgets/start-balance?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/widgets/time-date?user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
              />
              <WidgetItem
                url={`http://huntmaster.vercel.app/widgets/time-date-advanced?theme=neon&user=${currentUsername}`}
                imageSrc="https://gxciioabwrkahdfe.public.blob.vercel-storage.com/images/start-balance-widget.png-PSIKZvFILkH6gQJkeLb4YPtjtimYQ5.png"
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
            <p className="mt-4">
              <strong>Important:</strong> These URLs are personalized for your account ({currentUsername || "your username"}). 
              To use these in OBS Studio, add a Browser Source and paste the appropriate link. Each overlay and widget will display only your hunt data.
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <strong>Customization Note:</strong> The Spider overlay is highly customizable! Visit{" "}
              <Link href="/spider-edit" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                /spider-edit
              </Link>{" "}
              to customize colors, fonts, header text, border width, and more. Your customization settings will be saved to localStorage and applied to your Spider overlay.
            </p>
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
      <Dialog open={isExtensionTokenDialogOpen} onOpenChange={setIsExtensionTokenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Session Token Copied! ✓</DialogTitle>
            <DialogDescription>
              Your session token has been copied to your clipboard. Follow these steps to configure the browser extension:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <li>
                <strong>Open the browser extension</strong> - Click the HuntMaster Game Detector icon in your browser toolbar
              </li>
              <li>
                <strong>Scroll to "API Configuration"</strong> section at the bottom of the popup
              </li>
              <li>
                <strong>Paste the token</strong> - Click in the "Session Token" field and paste (Ctrl+V / Cmd+V)
              </li>
              <li>
                <strong>Set API URL</strong> - Make sure the API Base URL is set to:
                <br />
                <div className="mt-2 space-y-1">
                  {typeof window !== 'undefined' && window.location.hostname === 'localhost' ? (
                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs block">
                      http://localhost:3000
                    </code>
                  ) : (
                    <>
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs block">
                        https://huntmaster.vercel.app
                      </code>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        (For local development, use: http://localhost:3000)
                      </p>
                    </>
                  )}
                </div>
              </li>
              <li>
                <strong>Click "Save Configuration"</strong> - Your extension is now ready to use!
              </li>
            </ol>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm">
              <strong className="text-blue-800 dark:text-blue-200">💡 Tip:</strong>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Once configured, the extension will automatically detect games from casino sites and update your Now Playing widget.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsExtensionTokenDialogOpen(false)} variant="default">
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
