interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
}

/**
 * Deduplicates slots by ID and name (case-insensitive)
 * Returns unique slots array, keeping first occurrence of each duplicate
 */
export function deduplicateSlots<T extends Slot>(slots: T[]): T[] {
  if (!Array.isArray(slots) || slots.length === 0) {
    return slots
  }

  const seenIds = new Set<string>()
  const seenNames = new Map<string, T>()
  const uniqueSlots: T[] = []

  for (const slot of slots) {
    // Check by ID first
    if (seenIds.has(slot.id)) {
      console.log('Duplicate slot ID found:', slot.id, slot.name)
      continue
    }
    seenIds.add(slot.id)

    // Also check by name (case-insensitive) to catch duplicates with different IDs
    const nameKey = slot.name.toLowerCase().trim()
    if (seenNames.has(nameKey)) {
      console.log('Duplicate slot name found:', slot.name)
      continue
    }
    seenNames.set(nameKey, slot)
    uniqueSlots.push(slot)
  }

  if (uniqueSlots.length !== slots.length) {
    console.log(`Deduplicated: ${slots.length} slots -> ${uniqueSlots.length} unique slots`)
  }

  return uniqueSlots
}









