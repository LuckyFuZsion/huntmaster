# OBS Browser Sources - User-Specific Overlays

## Overview

Each OBS browser source can now display a specific user's slot data by adding a `user` parameter to the URL.

## How to Use

### 1. Basic URL Format

For any OBS browser source, add `?user=USERNAME` to the URL:

```
http://localhost:3000/obs?user=Steve
http://localhost:3000/obs-2?user=Steve
http://localhost:3000/obs-3?user=Steve
```

### 2. Available OBS Browser Sources

- `/obs` - Main slot list
- `/obs-2` - Stats overlay
- `/obs-3` - Top wins overlay
- `/obs-4` - Next bonus overlay
- `/obs-5` - Progress bar
- `/obs-6` - Time/date
- `/obs-7` - Hunt stats
- `/obs-8` - Additional stats

### 3. Example URLs

#### For User "Steve":
```
http://localhost:3000/obs?user=Steve&size=800px
http://localhost:3000/obs-2?user=Steve&size=400px
http://localhost:3000/obs-3?user=Steve
```

#### For User "Player2":
```
http://localhost:3000/obs?user=Player2&size=800px
http://localhost:3000/obs-2?user=Player2&size=400px
```

### 4. Without User Parameter (Fallback)

If no `user` parameter is provided, the browser source will:
- Attempt to load slots from the logged-in session
- Fall back to showing no slots if no session exists

### 5. Setting Up in OBS

1. Open OBS Studio
2. Right-click in your Sources panel
3. Select "Browser Source"
4. Enter a name (e.g., "Steve's Slot List")
5. Click "OK"
6. In the Browser Source properties:
   - **URL**: Enter your overlay URL with the user parameter
     - Example: `http://localhost:3000/obs?user=Steve&size=800px`
   - **Width**: Match the size parameter or your desired width
   - **Height**: Adjust as needed
   - **Custom CSS**: Leave empty or add custom styling
7. Click "OK"

### 6. Multiple Users

To show multiple users' data in the same scene:

1. Create separate browser sources for each user
2. Use different user parameters:
   - Browser Source 1: `http://localhost:3000/obs?user=Steve`
   - Browser Source 2: `http://localhost:3000/obs?user=Player2`
3. Position them as needed in your scene

### 7. How It Works

- The `user` parameter specifies which username's data to load
- The system looks up the user in Firestore
- It retrieves all slots associated with that user's ID
- The overlay updates every 2 seconds automatically

### 8. Troubleshooting

**Slots not showing?**
- Check that the username is correct (case-sensitive)
- Verify the user exists in Firestore
- Check browser console for errors

**Wrong user's data showing?**
- Ensure the `user` parameter is correct
- Clear browser cache if needed
- Restart the browser source in OBS

## Production Usage

When deployed to production, replace `localhost:3000` with your actual domain:

```
https://yourdomain.com/obs?user=Steve
https://yourdomain.com/obs-2?user=Steve
```

## Benefits

✅ **User-Specific**: Each overlay shows only the specified user's data
✅ **Multi-User Support**: Show multiple users' data simultaneously
✅ **Real-Time Updates**: Data refreshes every 2 seconds
✅ **No Login Required**: Works in OBS without active sessions
✅ **Scalable**: Easy to add more users or overlays

