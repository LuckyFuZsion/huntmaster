import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firestore-admin";
import { decrypt } from "@/lib/protection";

export async function POST(request: Request) {
  try {
    const { session, keyId } = await request.json();

    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    if (!keyId) {
      return NextResponse.json({ success: false, error: "keyId is required" }, { status: 400 });
    }

    const sessionData = JSON.parse(decrypt(session));
    const userId = sessionData.userId;

    // Verify the key belongs to this user before revoking
    const allKeys = await firestoreAdmin.apiKeys.findByUserId(userId);
    const keyToRevoke = allKeys.find((k) => k.id === keyId);

    if (!keyToRevoke) {
      return NextResponse.json({ success: false, error: "API key not found or access denied" }, { status: 404 });
    }

    await firestoreAdmin.apiKeys.revoke(keyId);

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";













