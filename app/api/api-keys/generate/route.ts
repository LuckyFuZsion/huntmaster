import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firestore-admin";
import { decrypt } from "@/lib/protection";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { session, name } = await request.json();

    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const sessionData = JSON.parse(decrypt(session));
    const userId = sessionData.userId;

    // Generate a random API key (32 bytes = 64 hex characters)
    const apiKey = crypto.randomBytes(32).toString("hex");
    
    // Hash the key using bcrypt (we'll use salt rounds of 10)
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Create the API key record
    const apiKeyRecord = await firestoreAdmin.apiKeys.create({
      userId,
      keyHash,
      name: name?.trim() || undefined,
      isActive: true,
    });

    // Return the key ONLY ONCE (this is the only time it will be visible)
    return NextResponse.json({
      success: true,
      data: {
        id: apiKeyRecord.id,
        key: apiKey, // Only shown once!
        name: apiKeyRecord.name,
        createdAt: apiKeyRecord.createdAt,
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










