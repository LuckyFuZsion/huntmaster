# Slots Firestore Migration

## What's Been Done

Your slot list is now stored in Firestore instead of localStorage. This means your slots are synced across all devices and browsers when you're logged in.

## How It Works

### For Logged-In Users:
1. When you log in as any user (e.g., "Steve"), your slot list is loaded from Firestore
2. When you add, edit, or delete slots, they're automatically saved to Firestore
3. Your slot list is tied to your user account
4. You can access your slots from any device/browser when logged in

### What Changed:
- ✅ Slots are now stored in Firestore `slots` collection
- ✅ Each slot is associated with the logged-in user via `userId`
- ✅ Slots are automatically saved when you make changes
- ✅ Other settings (startBalance, endBalance, etc.) still use localStorage

## Technical Details

### New Firestore Collection: `slots`
Each document contains:
- `id`: Auto-generated Firestore document ID
- `name`: Slot name
- `bet`: Bet amount
- `win`: Win amount (null if not collected)
- `userId`: ID of the user who owns this slot
- `createdAt`: Timestamp when slot was created

### API Endpoint: `/api/slots`
- **POST** with `action: "get"` - Loads slots for logged-in user
- **POST** with `action: "save"` - Saves slots for logged-in user

### Files Modified:
- `lib/firestore-admin.ts` - Added Slot interface and operations
- `app/api/slots/route.ts` - New API endpoint for slot operations
- `components/bonus-hunt-tracker.tsx` - Now saves/loads from Firestore

## Testing

1. Log in as any user
2. Add some slots to your list
3. Log in from a different device/browser
4. Your slots should appear automatically!

## Benefits

- ✨ Access your slot list from anywhere
- ✨ No need to manually sync across devices
- ✨ Centralized storage in Firestore
- ✨ User-specific slot lists

