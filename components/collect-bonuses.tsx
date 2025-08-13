"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  const router = useRouter()
  const noSpinnerClass =
    "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

  useEffect(() => {
    const storedSlots = localStorage.getItem("slotList")
    if (storedSlots) {
      setSlots(JSON.parse(storedSlots))
    }
  }, [])

  const handleUpdateWin = (id: string, win: string) => {
    const updatedSlots = slots.map((slot) =>
      slot.id === id ? { ...slot, win: win === "" ? null : Number(win) } : slot,
    )
    setSlots(updatedSlots)
    localStorage.setItem("slotList", JSON.stringify(updatedSlots))
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
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < slots.length - 1) {
      setCurrentIndex(currentIndex + 1)
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
                <Button onClick={handleNext} disabled={currentIndex === slots.length - 1}>
                  Next
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
