# Firebase Admin SDK Setup

## Current Status
✅ Firebase Client credentials added to `.env.local`

## Next Step: Get Firebase Admin SDK Credentials

To enable server-side Firebase operations, you need to get your Firebase Admin SDK service account key:

### Steps:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **fuzsionhunt**
3. Click on the gear icon (⚙️) next to "Project Overview"
4. Select **"Project settings"**
5. Scroll down to **"Service accounts"** tab
6. Click **"Generate new private key"**
7. A JSON file will be downloaded (e.g., `fuzsionhunt-firebase-adminsdk-xxxxx.json`)

### Add the Credentials

After downloading the JSON file, you can either:

#### Option A: Add as JSON string (Recommended)
Copy the entire JSON content and add it to your `.env.local`:

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"fuzsionhunt","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@fuzsionhunt.iam.gserviceaccount.com",...}
```

**Important**: Make sure to put the entire JSON on a single line, with no line breaks.

#### Option B: Extract individual values
From the JSON file, extract:
- `project_id` → `FIREBASE_PROJECT_ID` (already added)
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the newlines as `\n`)

Add to `.env.local`:
```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fuzsionhunt.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n...\n-----END PRIVATE KEY-----\n"
```

### Security Note
⚠️ Never commit the service account key to git. It's already in your `.gitignore` file.

## After Adding Credentials

Once you've added the Firebase Admin credentials to your `.env.local`, restart your development server:

```bash
npm run dev
```

## Test Your Setup

You can test if Firebase is working by trying to:
1. Login to the application
2. Create an admin user via the setup page
3. View users in the admin panel

