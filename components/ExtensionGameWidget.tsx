"use client";

import { useEffect, useState } from "react";
import { useSupabaseCurrentGame } from "@/lib/hooks/useSupabaseCurrentGame";
import { GameWidgetDisplay } from "./GameWidgetDisplay";
import { sanitizeProviderFilter } from "@/lib/game-search-utils";

interface ExtensionGameWidgetProps {
  title?: string; // Override title (highest priority)
  provider?: string; // Optional provider name
  username?: string; // When provided, fetches current game from extension API
  size?: number; // Thumbnail size in px
}

// Widget that displays games set via the browser extension
// Only fetches from /api/current-game/get (extension source)
export default function ExtensionGameWidget({ title: titleProp, provider: providerProp, username, size = 160 }: ExtensionGameWidgetProps) {
  const [autoTitle, setAutoTitle] = useState<string | null>(null);
  const [autoProvider, setAutoProvider] = useState<string | null>(null);

  // Fetch current game from extension API if username provided and no explicit title
  useEffect(() => {
    let cancelled = false;
    
    async function loadGame() {
      if (!username || titleProp) {
        setAutoTitle(null);
        setAutoProvider(null);
        return;
      }
      // Will be handled by real-time subscription
      setAutoTitle(null);
      setAutoProvider(null);
    }
  }, [username, titleProp]);

  // Use real-time subscription for current game
  const { currentGame } = useSupabaseCurrentGame(username && !titleProp ? username : null);

  // Update title from real-time current game
  useEffect(() => {
    if (!username || titleProp) {
      setAutoTitle(null);
      setAutoProvider(null);
      return;
    }
    
    if (currentGame?.gameTitle) {
      setAutoTitle(currentGame.gameTitle);
      setAutoProvider(currentGame.provider || null);
    } else {
      setAutoTitle(null);
      setAutoProvider(null);
    }
  }, [currentGame, username, titleProp]);

  const effectiveTitle = titleProp || autoTitle || "";
  const effectiveProvider = sanitizeProviderFilter(providerProp || autoProvider);

  // Don't render if no title available
  if (!effectiveTitle) return null;

  return (
    <GameWidgetDisplay 
      title={effectiveTitle} 
      provider={effectiveProvider} 
      username={username} 
      size={size} 
    />
  );
}


