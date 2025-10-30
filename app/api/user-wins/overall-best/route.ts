import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")

    if (!username) {
      return NextResponse.json({ success: false, error: "username is required" }, { status: 400 })
    }

    const user = await firestoreAdmin.users.findByUsername(username)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const overall = await firestoreAdmin.userWins.findOverallBestByUser(user.id)
    return NextResponse.json({ success: true, data: overall })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to fetch overall bests" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"

