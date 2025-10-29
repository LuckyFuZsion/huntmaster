# Firebase Setup Guide

## Overview
This project has been migrated from Neon PostgreSQL to Firebase (Firestore + Firebase Auth).

## Required Environment Variables

### Firebase Client Configuration
Add these to your `.env.local` file:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Firebase Admin Configuration (Server-side)
```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----

# OR as JSON (alternative method)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

## How to Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Click on the web icon (</>) to add a web app
6. Copy the configuration object values to your `.env.local`

## Getting Firebase Admin SDK

1. Go to Project Settings > Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Either:
   - Store the JSON in `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable, OR
   - Extract the values and put them in separate environment variables

## Migration Steps

1. Install Firebase packages:
   ```bash
   npm install firebase firebase-admin bcryptjs
   ```

2. Set up Firebase configuration files (already done in `lib/`):
   - `lib/firebase.ts` - Client-side Firebase setup
   - `lib/firebase-admin.ts` - Server-side Firebase setup
   - `lib/firestore-db.ts` - Firestore database operations

3. Update environment variables as shown above

4. Run the app - Firestore collections will be created automatically on first write

## Firebase Security Rules

Add these security rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Bonuses collection
    match /bonuses/{bonusId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Hunts collection
    match /hunts/{huntId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Features

- **Firestore Database**: NoSQL database for storing users, hunts, and bonuses
- **Password Hashing**: Passwords are hashed using bcrypt before storage
- **Automatic Collections**: Collections are created automatically on first write
- **Type Safety**: Full TypeScript support for database operations

