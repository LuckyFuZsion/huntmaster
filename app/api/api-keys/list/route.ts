import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firestore-admin";
import { decrypt } from "@/lib/protection";

export async function POST(request: Request) {
  try {
    const { session } = await request.json();

    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const sessionData = JSON.parse(decrypt(session));
    const userId = sessionData.userId;

    const apiKeys = await firestoreAdmin.apiKeys.findByUserId(userId);

    // Return keys without the actual key value (security - keys are only shown once on generation)
    return NextResponse.json({
      success: true,
      data: apiKeys.map((key) => ({
        id: key.id,
        name: key.name || "Unnamed Key",
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        isActive: key.isActive,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";










