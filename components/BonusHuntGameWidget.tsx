"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabaseCurrentGame } from "@/lib/hooks/useSupabaseCurrentGame";
import { useSupabaseSlotsByUsername } from "@/lib/hooks/useSupabaseSlotsByUsername";
import { GameWidgetDisplay } from "./GameWidgetDisplay";

interface BonusHuntGameWidgetProps {
  title?: string; // Override title (highest priority)
  provider?: string; // Optional provider name
  username?: string; // When provided, fetches next slot from bonus hunt
  size?: number; // Thumbnail size in px
}

// Widget that displays games from active bonus hunts
// Only fetches from /api/current-game/next (bonus hunt source)
export default function BonusHuntGameWidget({ title: titleProp, provider: providerProp, username, size = 160 }: BonusHuntGameWidgetProps) {
  const [autoTitle, setAutoTitle] = useState<string | null>(null);

  // Subscribe to real-time slot updates to detect when next slot changes
  const { slots, loading: slotsLoading } = useSupabaseSlotsByUsername(username && !titleProp ? username : null);

  // Function to find next slot with win === null from current slots
  const findNextSlot = useCallback((slotList: any[]) => {
    if (!slotList || slotList.length === 0) return null;
    
    // Deduplicate by name (keep first occurrence)
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const s of slotList) {
      const key = (s.name || "").toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }
    
    // Find first slot with win === null
    const nextSlot = unique.find((s) => s.win === null || s.win === undefined);
    console.log("Finding next slot:", {
      totalSlots: slotList.length,
      uniqueSlots: unique.length,
      nextSlotName: nextSlot?.name || null,
      slotsWithNullWin: unique.filter(s => s.win === null || s.win === undefined).map(s => s.name)
    });
    return nextSlot?.name || null;
  }, []);

  // Update title from real-time slots (prioritize next slot from hunt list)
  // This effect runs whenever slots change (including when wins are recorded)
  useEffect(() => {
    console.log("BonusHuntGameWidget: useEffect triggered", {
      username,
      titleProp,
      slotsLength: slots?.length,
      slotsLoading,
      slots: slots?.map(s => ({ name: s.name, win: s.win }))
    });
    
    if (!username || titleProp) {
      console.log("BonusHuntGameWidget: Skipping - no username or titleProp override");
      setAutoTitle(null);
      return;
    }
    
    // Use real-time slots to find next slot - this automatically updates when:
    // - A win is entered (slot.win changes from null to a number) - next slot moves forward
    // - A win is deleted/cleared (slot.win changes from number to null) - slot becomes available again
    // - New slots are added
    // - Slots are deleted
    if (slots && slots.length > 0) {
      const nextSlotName = findNextSlot(slots);
      console.log("BonusHuntGameWidget: Found next slot:", {
        nextSlotName,
        totalSlots: slots.length,
        slotsWithNullWin: slots.filter(s => s.win === null || s.win === undefined).map(s => s.name),
        currentAutoTitle: autoTitle
      });
      
      if (nextSlotName) {
        if (nextSlotName !== autoTitle) {
          console.log("BonusHuntGameWidget: Updating autoTitle from", autoTitle, "to", nextSlotName);
        setAutoTitle(nextSlotName);
        } else {
          console.log("BonusHuntGameWidget: Next slot unchanged:", nextSlotName);
        }
        return;
      } else {
        // No next slot found - all bonuses opened
        console.log("BonusHuntGameWidget: No next slot found - all bonuses opened. Total slots:", slots.length);
        if (autoTitle !== null) {
        setAutoTitle(null);
        }
      }
    } else if (slots && slots.length === 0) {
      // No slots at all
      console.log("BonusHuntGameWidget: No slots found for user");
      if (autoTitle !== null) {
      setAutoTitle(null);
      }
    } else if (slotsLoading) {
      // Still loading - don't do anything yet
      console.log("BonusHuntGameWidget: Slots still loading");
    } else {
      // Slots not loaded yet or undefined - fetch from API as initial load
      console.log("BonusHuntGameWidget: Fetching initial next slot from API");
      let cancelled = false;
      
      async function loadNextSlot() {
        try {
          const res = await fetch(`/api/current-game/next?username=${encodeURIComponent(username)}`, { cache: "no-store" });
          const data = await res.json();
          if (cancelled) return;
          
          console.log("BonusHuntGameWidget: API response:", data);
          
          if (data?.success && data?.data?.title) {
            setAutoTitle(data.data.title);
          } else {
            setAutoTitle(null);
          }
        } catch (error) {
          if (!cancelled) {
            console.error("BonusHuntGameWidget: Error loading next slot:", error);
            setAutoTitle(null);
          }
        }
      }
      
      loadNextSlot();
      return () => { cancelled = true; };
    }
  }, [username, titleProp, slots, slotsLoading, findNextSlot]);
  
  // Use real-time subscription for current game as fallback only
  const { currentGame } = useSupabaseCurrentGame(username && !titleProp ? username : null);
  
  // Update title from currentGame only if we don't have a next slot
  useEffect(() => {
    if (!username || titleProp || autoTitle) {
      // Don't override if we already have a next slot
      return;
    }
    
    if (currentGame?.gameTitle) {
      setAutoTitle(currentGame.gameTitle);
    }
  }, [currentGame, username, titleProp, autoTitle]);

  const effectiveTitle = titleProp || autoTitle || "";

  // Don't render if no title available
  if (!effectiveTitle) return null;

  return (
    <GameWidgetDisplay 
      title={effectiveTitle} 
      provider={providerProp} 
      username={username} 
      size={size} 
    />
  );
}


