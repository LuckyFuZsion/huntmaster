"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, Type, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface ColorState {
  headerStart: string
  headerEnd: string
  footerStart: string
  footerEnd: string
  tableEven: string
  tableOdd: string
  fontColor: string
  borderColor: string
}

interface TextColorState {
  headerText: string
  statsLabels: string
  statsValues: string
  tableHeaders: string
  tableContent: string
  biggestWinLabel: string
  biggestWinValue: string
  biggestMultiLabel: string
  biggestMultiValue: string
  progressText: string
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
  "Segoe UI",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Comic Sans MS",
  "Raleway",
]

// Default colors and settings
const defaultColors: ColorState = {
  headerStart: "#1a00ba",
  headerEnd: "#0a0060",
  footerStart: "#1a00ba",
  footerEnd: "#0a0060",
  tableEven: "rgba(255,255,255,0.03)",
  tableOdd: "transparent",
  fontColor: "#ffffff",
  borderColor: "#ffffff",
}

const defaultTextColors: TextColorState = {
  headerText: "#ffffff",
  statsLabels: "#ffffff",
  statsValues: "#ffd700",
  tableHeaders: "#8BB8E8",
  tableContent: "#ffffff",
  biggestWinLabel: "#ffffff",
  biggestWinValue: "#ffd700",
  biggestMultiLabel: "#ffffff",
  biggestMultiValue: "#ff6b6b",
  progressText: "#ffd700",
}

const defaultFont = "Arial"
const defaultBorderWidth = 1
const defaultHeaderText = "🕷️ 🎰 BONUS HUNT"
const defaultFooterText = "Huntmaster - Created by LuckyFuZsion for abigwetspider"

// Predefined color palette
const colorPalette = [
  // Reds
  "#FF0000",
  "#FF3333",
  "#FF6666",
  "#FF9999",
  "#FFCCCC",
  // Oranges
  "#FF6600",
  "#FF8000",
  "#FF9933",
  "#FFB366",
  "#FFCC99",
  // Yellows
  "#FFFF00",
  "#FFFF33",
  "#FFFF66",
  "#FFFF99",
  "#FFFFCC",
  // Greens
  "#00FF00",
  "#33FF33",
  "#66FF66",
  "#99FF99",
  "#CCFFCC",
  // Blues
  "#0000FF",
  "#3333FF",
  "#6666FF",
  "#9999FF",
  "#CCCCFF",
  // Purples
  "#6600FF",
  "#8000FF",
  "#9933FF",
  "#B366FF",
  "#CC99FF",
  // Pinks
  "#FF00FF",
  "#FF33FF",
  "#FF66FF",
  "#FF99FF",
  "#FFCCFF",
  // Golds
  "#FFD700",
  "#FFC125",
  "#DAA520",
  "#B8860B",
  "#CD7F32",
  // Grays
  "#000000",
  "#333333",
  "#666666",
  "#999999",
  "#CCCCCC",
  "#FFFFFF",
]

export default function SpiderEdit() {
  const [colors, setColors] = useState<ColorState>({ ...defaultColors })
  const [textColors, setTextColors] = useState<TextColorState>({ ...defaultTextColors })
  const [fontFamily, setFontFamily] = useState(defaultFont)
  const [activeColor, setActiveColor] = useState<keyof ColorState | keyof TextColorState>("headerStart")
  const [hexInput, setHexInput] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("colors")
  const [borderWidth, setBorderWidth] = useState(defaultBorderWidth)
  const [headerText, setHeaderText] = useState(defaultHeaderText)
  // Footer text is no longer editable, but we'll keep it in state for consistency
  const footerText = defaultFooterText

  useEffect(() => {
    // Load colors from localStorage
    const storedColors = localStorage.getItem("spiderColors")
    if (storedColors) {
      setColors(JSON.parse(storedColors))
    }

    // Load text colors from localStorage
    const storedTextColors = localStorage.getItem("spiderTextColors")
    if (storedTextColors) {
      setTextColors(JSON.parse(storedTextColors))
    }

    // Load font family from localStorage
    const storedFontFamily = localStorage.getItem("spiderFontFamily")
    if (storedFontFamily) {
      setFontFamily(storedFontFamily)
    }

    // Load border width from localStorage
    const storedBorderWidth = localStorage.getItem("spiderBorderWidth")
    if (storedBorderWidth) {
      setBorderWidth(Number.parseInt(storedBorderWidth))
    }

    // Load header text from localStorage
    const storedHeaderText = localStorage.getItem("spiderHeaderText")
    if (storedHeaderText) {
      setHeaderText(storedHeaderText)
    }

    // Always set footer text to default in localStorage
    localStorage.setItem("spiderFooterText", defaultFooterText)
  }, [])

  useEffect(() => {
    // Save colors to localStorage whenever they change
    localStorage.setItem("spiderColors", JSON.stringify(colors))
  }, [colors])

  useEffect(() => {
    // Save text colors to localStorage whenever they change
    localStorage.setItem("spiderTextColors", JSON.stringify(textColors))
  }, [textColors])

  useEffect(() => {
    // Save font family to localStorage whenever it changes
    localStorage.setItem("spiderFontFamily", fontFamily)
  }, [fontFamily])

  useEffect(() => {
    // Save border width to localStorage whenever it changes
    localStorage.setItem("spiderBorderWidth", borderWidth.toString())
  }, [borderWidth])

  useEffect(() => {
    // Save header text to localStorage whenever it changes
    localStorage.setItem("spiderHeaderText", headerText)
  }, [headerText])

  useEffect(() => {
    // Update hex input when active color changes
    if (activeColor in colors) {
      setHexInput(colors[activeColor as keyof ColorState])
    } else if (activeColor in textColors) {
      setHexInput(textColors[activeColor as keyof TextColorState])
    }
  }, [activeColor, colors, textColors])

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setHexInput(value)

    // Validate and update color
    if (
      value.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/) ||
      value.match(/^rgba?$$\d+,\s*\d+,\s*\d+(?:,\s*([0-9.]+))?$$$/) ||
      value.match(/^hsla?$$\d+,\s*\d+%,\s*\d+%(?:,\s*([0-9.]+))?$$$/)
    ) {
      if (activeColor in colors) {
        setColors((prev) => ({
          ...prev,
          [activeColor]: value,
        }))
      } else if (activeColor in textColors) {
        setTextColors((prev) => ({
          ...prev,
          [activeColor]: value,
        }))
      }
    }
  }

  // Reset to defaults function
  const resetToDefaults = () => {
    setColors({ ...defaultColors })
    setTextColors({ ...defaultTextColors })
    setFontFamily(defaultFont)
    setBorderWidth(defaultBorderWidth)
    setHeaderText(defaultHeaderText)
    setHexInput(
      defaultColors[activeColor as keyof ColorState] || defaultTextColors[activeColor as keyof TextColorState],
    )
  }

  // Reset typography only
  const resetTypography = () => {
    setFontFamily(defaultFont)
    setHeaderText(defaultHeaderText)
    setTextColors({ ...defaultTextColors })
  }

  const handleColorSelect = (color: string) => {
    if (activeColor in colors) {
      setColors((prev) => ({
        ...prev,
        [activeColor]: color,
      }))
    } else if (activeColor in textColors) {
      setTextColors((prev) => ({
        ...prev,
        [activeColor]: color,
      }))
    }
    setHexInput(color)
  }

  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value)
  }

  const handleBorderWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value) && value >= 0 && value <= 10) {
      setBorderWidth(value)
    }
  }

  const handleHeaderTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHeaderText(e.target.value)
  }

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color)
    setCopied(color)
    setTimeout(() => setCopied(null), 2000)
  }

  const ColorPreview = ({ color }: { color: string }) => (
    <div
      className="w-8 h-8 rounded border border-white/20"
      style={{ background: color }}
      onClick={() => copyToClipboard(color)}
    />
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Spider Browser Source Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>Background Colors</span>
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span>Typography</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-6 pt-4">
              {/* Color Selection Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Label>Header Gradient</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={cn("flex-1", activeColor === "headerStart" && "ring-2 ring-primary ring-offset-2")}
                      onClick={() => setActiveColor("headerStart")}
                    >
                      <ColorPreview color={colors.headerStart} />
                      <span className="ml-2">Start</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={cn("flex-1", activeColor === "headerEnd" && "ring-2 ring-primary ring-offset-2")}
                      onClick={() => setActiveColor("headerEnd")}
                    >
                      <ColorPreview color={colors.headerEnd} />
                      <span className="ml-2">End</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Footer Gradient</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={cn("flex-1", activeColor === "footerStart" && "ring-2 ring-primary ring-offset-2")}
                      onClick={() => setActiveColor("footerStart")}
                    >
                      <ColorPreview color={colors.footerStart} />
                      <span className="ml-2">Start</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={cn("flex-1", activeColor === "footerEnd" && "ring-2 ring-primary ring-offset-2")}
                      onClick={() => setActiveColor("footerEnd")}
                    >
                      <ColorPreview color={colors.footerEnd} />
                      <span className="ml-2">End</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Table Row Colors</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={cn("flex-1", activeColor === "tableEven" && "ring-2 ring-primary ring-offset-2")}
                      onClick={() => setActiveColor("tableEven")}
                    >
                      <ColorPreview color={colors.tableEven} />
                      <span className="ml-2">Even</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={cn("flex-1", activeColor === "tableOdd" && "ring-2 ring-primary ring-offset-2")}
                      onClick={() => setActiveColor("tableOdd")}
                    >
                      <ColorPreview color={colors.tableOdd} />
                      <span className="ml-2">Odd</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Border Settings</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={cn("flex-1", activeColor === "borderColor" && "ring-2 ring-primary ring-offset-2")}
                      onClick={() => setActiveColor("borderColor")}
                    >
                      <ColorPreview color={colors.borderColor} />
                      <span className="ml-2">Color</span>
                    </Button>
                    <div className="flex-1 flex items-center gap-2">
                      <Label htmlFor="border-width" className="whitespace-nowrap text-xs">
                        Width:
                      </Label>
                      <Input
                        id="border-width"
                        type="number"
                        min="0"
                        max="10"
                        value={borderWidth}
                        onChange={handleBorderWidthChange}
                        className="w-full h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hex Input */}
              <div className="space-y-2">
                <Label htmlFor="hex-input">Color Value (Hex, RGB, or HSL)</Label>
                <div className="flex gap-2">
                  <Input
                    id="hex-input"
                    value={hexInput}
                    onChange={handleHexInputChange}
                    placeholder="#000000 or rgb(0,0,0) or hsl(0,0%,0%)"
                    className="font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(hexInput)} className="relative">
                    {copied === hexInput ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Color Palette */}
              <div className="space-y-4">
                <Label>Color Palette (Works for both background and text colors)</Label>
                <div className="grid grid-cols-6 gap-2">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      className="w-10 h-10 rounded border border-white/20 hover:scale-110 transition-transform"
                      style={{ background: color }}
                      onClick={() => handleColorSelect(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Current Color Preview */}
              <div className="space-y-2">
                <Label>Current Color</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded border border-white/20" style={{ background: hexInput }} />
                  <div className="space-y-1">
                    <div className="font-medium">{hexInput}</div>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(hexInput)} className="relative">
                      {copied === hexInput ? (
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="w-full h-20 rounded overflow-hidden">
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        activeColor.includes("header") || activeColor.includes("footer")
                          ? `linear-gradient(to bottom, ${colors[activeColor.replace("End", "Start") as keyof ColorState]}, ${
                              colors[activeColor.replace("Start", "End") as keyof ColorState]
                            })`
                          : hexInput,
                    }}
                  />
                </div>
              </div>

              {/* Border Preview */}
              <div className="space-y-2">
                <Label>Border Preview</Label>
                <div
                  className="w-full h-20 rounded overflow-hidden"
                  style={{
                    border: `${borderWidth}px solid ${colors.borderColor}`,
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center text-white">
                    {borderWidth}px {colors.borderColor} border
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <div className="flex justify-center">
                <Button variant="outline" onClick={resetToDefaults} className="mt-4">
                  Reset to Default Colors and Font
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="typography" className="space-y-6 pt-4">
              {/* Font Family */}
              <div className="space-y-4">
                <Label htmlFor="font-family">Font Family</Label>
                <Select value={fontFamily} onValueChange={handleFontFamilyChange}>
                  <SelectTrigger id="font-family">
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: font }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Header Text */}
              <div className="space-y-2">
                <Label htmlFor="header-text">Header Text</Label>
                <Input
                  id="header-text"
                  value={headerText}
                  onChange={handleHeaderTextChange}
                  placeholder="Enter header text"
                />
              </div>

              {/* Color Selection Tools for Typography */}
              <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="typography-hex-input">Color Value (Hex, RGB, or HSL)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="typography-hex-input"
                      value={hexInput}
                      onChange={handleHexInputChange}
                      placeholder="#000000 or rgb(0,0,0) or hsl(0,0%,0%)"
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(hexInput)}
                      className="relative"
                    >
                      {copied === hexInput ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color Palette</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorPalette.slice(0, 24).map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border border-white/20 hover:scale-110 transition-transform"
                        style={{ background: color }}
                        onClick={() => handleColorSelect(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div className="w-12 h-12 rounded border border-white/20" style={{ background: hexInput }} />
                  <div className="text-sm">
                    <div className="font-medium">Current Color: {hexInput}</div>
                    <div className="text-muted-foreground">
                      Click any color button below, then use the palette above to change it
                    </div>
                  </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="header">
                  <AccordionTrigger>Header Text Colors</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Header Text</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "headerText" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("headerText")}
                        >
                          <ColorPreview color={textColors.headerText} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Progress Text</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "progressText" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("progressText")}
                        >
                          <ColorPreview color={textColors.progressText} />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stats">
                  <AccordionTrigger>Stats Text Colors</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Stats Labels (START BAL, AVG X, etc.)</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "statsLabels" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("statsLabels")}
                        >
                          <ColorPreview color={textColors.statsLabels} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Stats Values</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "statsValues" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("statsValues")}
                        >
                          <ColorPreview color={textColors.statsValues} />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="highlights">
                  <AccordionTrigger>Highlight Text Colors</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Biggest Win Label</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "biggestWinLabel" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("biggestWinLabel")}
                        >
                          <ColorPreview color={textColors.biggestWinLabel} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Biggest Win Value</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "biggestWinValue" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("biggestWinValue")}
                        >
                          <ColorPreview color={textColors.biggestWinValue} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Biggest Multi Label</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "biggestMultiLabel" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("biggestMultiLabel")}
                        >
                          <ColorPreview color={textColors.biggestMultiLabel} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Biggest Multi Value</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "biggestMultiValue" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("biggestMultiValue")}
                        >
                          <ColorPreview color={textColors.biggestMultiValue} />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="table">
                  <AccordionTrigger>Table Text Colors</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Table Headers (SLOT, BET, WIN, X)</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "tableHeaders" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("tableHeaders")}
                        >
                          <ColorPreview color={textColors.tableHeaders} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Table Content</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(activeColor === "tableContent" && "ring-2 ring-primary ring-offset-2")}
                          onClick={() => setActiveColor("tableContent")}
                        >
                          <ColorPreview color={textColors.tableContent} />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Footer Text (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="footer-text">Footer Text (Cannot be changed)</Label>
                <Input
                  id="footer-text"
                  value={footerText}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 opacity-70"
                />
                <p className="text-xs text-muted-foreground">
                  The footer text is locked to maintain branding consistency.
                </p>
              </div>

              {/* Reset Typography Button */}
              <div className="flex justify-center">
                <Button variant="outline" onClick={resetTypography} className="mt-4">
                  Reset Typography Only
                </Button>
              </div>

              {/* Text Preview */}
              <div className="space-y-2">
                <Label>Text Preview</Label>
                <div
                  className="p-4 rounded border border-white/20 min-h-[100px]"
                  style={{
                    fontFamily: fontFamily,
                    background: colors.tableEven,
                  }}
                >
                  <div className="text-2xl font-bold mb-2" style={{ color: textColors.headerText }}>
                    Header Text
                  </div>
                  <div className="text-base" style={{ color: textColors.statsLabels }}>
                    Stats Label: <span style={{ color: textColors.statsValues }}>Stats Value</span>
                  </div>
                  <div className="text-sm mt-2" style={{ color: textColors.tableHeaders }}>
                    Table Header: <span style={{ color: textColors.tableContent }}>Table Content</span>
                  </div>
                </div>
              </div>

              {/* Header and Footer Preview */}
              <div className="space-y-2">
                <Label>Header Preview</Label>
                <div
                  className="p-4 rounded border border-white/20"
                  style={{
                    fontFamily: fontFamily,
                    color: textColors.headerText,
                    background: `linear-gradient(to bottom, ${colors.headerStart}, ${colors.headerEnd})`,
                  }}
                >
                  <div className="text-xl font-bold">{headerText}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Footer Preview (Fixed)</Label>
                <div
                  className="p-4 rounded border border-white/20"
                  style={{
                    fontFamily: fontFamily,
                    color: colors.fontColor,
                    background: `linear-gradient(to top, ${colors.footerStart}, ${colors.footerEnd})`,
                  }}
                >
                  <div className="text-center">{footerText}</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

