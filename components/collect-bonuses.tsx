"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"
import { useRouter, useSearchParams } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check } from "lucide-react"

interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

export function CollectBonuses() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [isSingleEntry, setIsSingleEntry] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [savedSlots, setSavedSlots] = useState<Set<string>>(new Set())
  const hasLoadedRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const username = searchParams.get("user")
  const noSpinnerClass =
    "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

  useEffect(() => {
    if (hasLoadedRef.current) {
      console.log("Already loaded, skipping duplicate load")
      return
    }
    hasLoadedRef.current = true
    
    const loadSlotsFromFirestore = async () => {
      try {
        // If username is provided, load that user's slots
        if (username) {
          const response = await fetch(`/api/slots/by-username?username=${username}`)
          const data = await response.json()
          console.log("Loaded slots from Firestore (username):", data.slots?.length || 0, "slots")
          if (data.success && data.slots) {
            const loadedSlots = data.slots.map((slot: any) => ({
              id: slot.id,
              name: slot.name,
              bet: slot.bet,
              win: slot.win,
            }))
            
            // Deduplicate by name on load
            const seen = new Map<string, Slot>()
            const uniqueSlots = loadedSlots.filter(slot => {
              if (seen.has(slot.name)) {
                console.log("Duplicate slot on load:", slot.name)
                return false
              }
              seen.set(slot.name, slot)
              return true
            })
            
              if (uniqueSlots.length !== loadedSlots.length) {
                console.log(`Removed ${loadedSlots.length - uniqueSlots.length} duplicates on load`)
              }
              
              console.log("Loaded unique slots names:", uniqueSlots.map(s => s.name))
              setSlots(uniqueSlots)
              
              // Mark slots with existing win amounts as already saved
              const slotsWithWins = uniqueSlots
                .filter(slot => slot.win !== null && slot.win > 0)
                .map(slot => slot.id)
              setSavedSlots(new Set(slotsWithWins))
              console.log("Marked slots as saved:", slotsWithWins.length, "slots with wins")
              
              setInitialLoadComplete(true)
          } else {
            setInitialLoadComplete(true)
          }
        } else {
          // Fallback to session-based loading
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
            console.log("Loaded slots from Firestore (session):", data.slots?.length || 0, "slots")
            if (data.success && data.slots) {
              const loadedSlots = data.slots.map((slot: any) => ({
                id: slot.id,
                name: slot.name,
                bet: slot.bet,
                win: slot.win,
              }))
              
              // Deduplicate by name on load
              const seen = new Map<string, Slot>()
              const uniqueSlots = loadedSlots.filter(slot => {
                if (seen.has(slot.name)) {
                  console.log("Duplicate slot on load (session):", slot.name)
                  return false
                }
                seen.set(slot.name, slot)
                return true
              })
              
              if (uniqueSlots.length !== loadedSlots.length) {
                console.log(`Removed ${loadedSlots.length - uniqueSlots.length} duplicates on load (session)`)
              }
              
              setSlots(uniqueSlots)
              
              // Mark slots with existing win amounts as already saved
              const slotsWithWins = uniqueSlots
                .filter(slot => slot.win !== null && slot.win > 0)
                .map(slot => slot.id)
              setSavedSlots(new Set(slotsWithWins))
              console.log("Marked slots as saved (session):", slotsWithWins.length, "slots with wins")
              
              setInitialLoadComplete(true)
            } else {
              setInitialLoadComplete(true)
            }
          } else {
            setInitialLoadComplete(true)
          }
        }
      } catch (error) {
        console.error("Error loading slots from Firestore:", error)
        // Fallback to localStorage for backwards compatibility
        const storedSlots = localStorage.getItem("slotList")
        if (storedSlots) {
          setSlots(JSON.parse(storedSlots))
        }
      }
      setInitialLoadComplete(true)
    }

    loadSlotsFromFirestore()
  }, [username])

  const handleUpdateWin = async (id: string, win: string) => {
    console.log("Updating win for slot:", id, "to", win)
    console.log("Current slots count:", slots.length)
    console.log("Current slots:", slots.map(s => ({id: s.id, name: s.name})))
    console.log("initialLoadComplete:", initialLoadComplete)
    
    const updatedSlots = slots.map((slot) =>
      slot.id === id ? { ...slot, win: win === "" ? null : Number(win) } : slot,
    )
    console.log("Updated slots count:", updatedSlots.length)
    console.log("Updated slots:", updatedSlots.map(s => ({id: s.id, name: s.name})))
    setSlots(updatedSlots)
    
    // Mark slot as unsaved when user changes the win amount
    setSavedSlots(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    
    // Only save to Firestore if initial load is complete to prevent duplicates
    if (!initialLoadComplete) {
      console.log("Initial load not complete, skipping save")
      return
    }
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Auto-save removed - use Save All button instead
  }

  const handleSaveSingleSlot = async (id: string) => {
    if (!initialLoadComplete) {
      return
    }
    
    // Prevent multiple simultaneous saves
    if (isSavingRef.current) {
      console.log("Save already in progress, skipping...")
      return
    }
    
    // Check if we've already saved this slot recently (within 1 second)
    if (savedSlots.has(id)) {
      console.log("Slot already saved, skipping duplicate save:", id)
      return
    }
    
    isSavingRef.current = true
    
    try {
      const session = localStorage.getItem("huntmaster_session")
      if (session) {
        // Get the slot to save
        const slotToSave = slots.find(s => s.id === id)
        if (!slotToSave) return
        
        console.log("Updating single slot in Firestore:", slotToSave.name, "Win:", slotToSave.win)
        
        // Update just this one slot
        const response = await fetch("/api/slots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session, action: "update-single", slot: slotToSave }),
        })
        if (!response.ok) {
          console.error("API error:", response.status)
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        if (data.success) {
          // Mark this slot as saved (permanently, until it's changed)
          console.log("Slot updated successfully:", id, slotToSave.name)
          setSavedSlots(prev => new Set(prev).add(id))
          
          // Don't remove it from savedSlots - it stays green until the user changes it
        }
      }
    } catch (error) {
      console.error("Error saving slots:", error)
    } finally {
      isSavingRef.current = false
    }
  }

  const handleBack = () => {
    router.push("/")
  }

  const toggleMode = () => {
    setIsSingleEntry(!isSingleEntry)
    setCurrentIndex(0)
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      // Save the current slot before moving to previous
      handleSaveSingleSlot(slots[currentIndex].id)
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    // Always save the current slot
    handleSaveSingleSlot(slots[currentIndex].id)
    
    if (currentIndex < slots.length - 1) {
      // Move to next slot
      setCurrentIndex(currentIndex + 1)
    } else {
      // On last slot, end hunt - navigate back to dashboard
      router.push("/")
    }
  }

  return (
    <Card className="w-full max-w-[324px] absolute top-0 left-0">
      <CardContent className="px-2 pt-0">
        <div className="space-y-4">
          <div className="flex justify-between mb-4 gap-2">
            <Button onClick={handleBack} variant="outline" className="text-xs px-2 py-1">
              Go back
            </Button>
            <Button onClick={toggleMode} className="text-xs px-2 py-1">
              {isSingleEntry ? "Full List" : "Single Entry"}
            </Button>
          </div>

          {isSingleEntry ? (
            <div className="space-y-4">
              {slots[currentIndex] && (
                <div key={slots[currentIndex].id} className="space-y-2">
                  <div>Slot Number: {currentIndex + 1}</div>
                  <div>Slot Name: {slots[currentIndex].name}</div>
                  <div>Bet Size: {slots[currentIndex].bet.toFixed(2)}</div>
                  <Input
                    type="number"
                    placeholder="Win Amount"
                    value={slots[currentIndex].win ?? ""}
                    onChange={(e) => handleUpdateWin(slots[currentIndex].id, e.target.value)}
                    className={`w-full ${noSpinnerClass}`}
                  />
                </div>
              )}
              <div className="flex justify-between">
                <Button onClick={handlePrevious} disabled={currentIndex === 0}>
                  Previous
                </Button>
                <Button 
                  onClick={handleNext}
                  variant={currentIndex === slots.length - 1 ? "default" : "default"}
                >
                  {currentIndex === slots.length - 1 ? "End Hunt" : "Next"}
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[420px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px] p-2">No.</TableHead>
                    <TableHead className="w-[110px] p-2">Slot Name</TableHead>
                    <TableHead className="w-[50px] p-2">Bet</TableHead>
                    <TableHead className="p-2">Win Amount</TableHead>
                    <TableHead className="w-[40px] p-2"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot, index) => (
                    <TableRow key={slot.id}>
                      <TableCell className="text-center p-2">{index + 1}</TableCell>
                      <TableCell className="p-2">{slot.name}</TableCell>
                      <TableCell className="text-right p-2">{slot.bet.toFixed(2)}</TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          placeholder="Win Amount"
                          value={slot.win ?? ""}
                          onChange={(e) => handleUpdateWin(slot.id, e.target.value)}
                          className={`w-full ${noSpinnerClass}`}
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Button
                          size="icon"
                          variant={savedSlots.has(slot.id) && slot.win !== null && slot.win > 0 ? "default" : "ghost"}
                          className={`h-8 w-8 ${savedSlots.has(slot.id) && slot.win !== null && slot.win > 0 ? "!bg-green-500 hover:!bg-green-600" : ""}`}
                          onClick={() => handleSaveSingleSlot(slot.id)}
                        >
                          <Check className={`h-4 w-4 ${savedSlots.has(slot.id) && slot.win !== null && slot.win > 0 ? "!text-white" : ""}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
;<style jsx>
  {`
    .no-spinner::-webkit-inner-spin-button,
    .no-spinner::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .no-spinner {
      -moz-appearance: textfield;
    }
  `}
</style>
