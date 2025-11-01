import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firestore-admin";
import { adminDb } from "@/lib/firebase-admin";
import * as bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ success: false, error: "API key is required" }, { status: 400 });
    }

    // Get all active API keys (we need to check each one since we can't query by hash directly)
    // In production, you might want to index by keyHash or use a different lookup strategy
    const allKeys = await firestoreAdmin.apiKeys.findByUserId(""); // Empty won't work, we need a different approach
    
    // Better approach: Get the key hash from the API key and search for it
    // Since we can't query by hash efficiently, we'll need to check all keys
    // For better performance, you could maintain a lookup table, but for now we'll do it this way
    
    // Actually, let's use a more efficient approach: store a lookup index
    // For MVP, let's get all keys and check them
    // Note: This is not ideal for scale, but works for now
    
    // We need a way to find the key. Let's add a helper that checks all keys
    // For better performance in the future, you could:
    // 1. Store keyHash -> userId mapping in a separate collection
    // 2. Or use the keyHash as the document ID in a lookup collection
    
    // For now, let's create a simple lookup by getting all active keys and checking
    // Note: This is not ideal for scale - in production you'd want an indexed lookup
    const snapshot = await adminDb.collection("apiKeys")
      .where("isActive", "==", true)
      .get();
    
    let matchedKey = null;
    let matchedUserId = null;

    for (const doc of snapshot.docs) {
      const keyData = doc.data();
      // Check if the provided key matches this key's hash
      const isValid = await bcrypt.compare(apiKey, keyData.keyHash);
      if (isValid) {
        matchedKey = { id: doc.id, ...keyData };
        matchedUserId = keyData.userId;
        break;
      }
    }

    if (!matchedKey || !matchedUserId) {
      return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 401 });
    }

    // Update last used timestamp
    await firestoreAdmin.apiKeys.update(matchedKey.id, { lastUsedAt: new Date() });

    // Get user info
    const user = await firestoreAdmin.users.findOne(matchedUserId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

