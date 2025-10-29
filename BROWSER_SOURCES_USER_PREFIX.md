# Browser Sources with User Prefix - Implementation Guide

## Current Status

### ✅ Fully Implemented
1. **Main Dane tracker** (`/` page) - Already user-specific via session
2. **OBS Browser Source** (`/obs`) - Supports `?user=USERNAME`
3. **OBS Browser Source 2** (`/obs-2`) - Supports `?user=USERNAME`  
4. **Collect Bonuses** (`/collect-bonuses`) - Supports `?user=USERNAME`

### ⚠️ Needs Update (Still use localStorage)
- OBS Browser Source 3 (`/obs-3`)
- OBS Browser Source 4 (`/obs-4`)
- OBS Browser Source 5 (`/obs-5`)
- OBS Browser Source 6 (`/obs-6`)
- OBS Browser Source 7 (`/obs-7`)
- OBS Browser Source 8 (`/obs-8`)

## How to Use

### For User-Specific Overlays:

**Basic Format:**
```
http://localhost:3000/[route]?user=USERNAME
```

**Examples:**
```bash
# Main overlay for user "Steve"
http://localhost:3000/obs?user=Steve&size=800px

# Stats overlay for user "Player2"
http://localhost:3000/obs-2?user=Player2

# Collect bonuses for user "Steve"
http://localhost:3000/collect-bonuses?user=Steve

# Top wins overlay
http://localhost:3000/obs-3?user=Steve
```

### Without User Parameter:

If no `?user=USERNAME` is provided, the component will:
- Load data from the logged-in session (if available)
- Fall back to showing no data if no session exists

## Implementation Pattern

For each browser source component, you need to:

1. **Add username parameter:**
```typescript
const searchParams = useSearchParams()
const size = searchParams.get("size") || "600px"
const username = searchParams.get("user") // Add this line
```

2. **Update useEffect dependency:**
```typescript
// Change this:
  }, [])

// To this:
  }, [username])
```

3. **Load slots based on username:**
```typescript
useEffect(() => {
  const loadSlotsFromFirestore = async () => {
    try {
      // If username is provided, load that user's slots
      if (username) {
        const response = await fetch(`/api/slots/by-username?username=${username}`)
        const data = await response.json()
        if (data.success && data.slots) {
          setSlots(data.slots.map((slot: any) => ({
            id: slot.id,
            name: slot.name,
            bet: slot.bet,
            win: slot.win,
          })))
        }
      } else {
        // Fallback to session-based loading
        const session = localStorage.getItem("huntmaster_session")
        if (session) {
          const response = await fetch("/api/slots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session, action: "get单位的 }),
          })
          const data = await response.json()
          if (data.success && data.slots) {
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
      console.error("Error loading slots:", error)
    }
  }
  
  loadSlotsFromFirestore()
  const interval = setInterval(loadSlotsFromFirestore, 2000)
  return () => clearInterval(interval)
}, [username])
```

## OBS Setup Instructions

1. **Create Browser Source in OBS**
2. **Set URL with user parameter:**
   - Example: `http://localhost:3000/obs?user=Steve`
3. **Adjust size as needed:**
   - Example: `http://localhost:3000/obs?user=Steve&size=800px`
4. **Multiple users:**
   - Create separate browser sources for each user
   - Each with different `?user=` parameter

## Benefits

✅ **User-specific data** - Each overlay shows only the specified user's info
✅ **Multi-user support** - Show multiple users simultaneously
✅ **No login required** - Works in OBS without active sessions
✅ **Real-time updates** - Refreshes every 2 seconds
✅ **Cross-device** - Data loads from Firestore

