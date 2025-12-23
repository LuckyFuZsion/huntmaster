import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { decrypt } from "@/lib/protection"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Win ID is required" },
        { status: 400 }
      )
    }

    // Get session token from request
    const sessionHeader = request.headers.get("x-huntmaster-session")
    const url = new URL(request.url)
    const sessionParam = url.searchParams.get("session")
    const session = sessionHeader || sessionParam

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Decrypt session to get user info
    let sessionData: any
    try {
      sessionData = JSON.parse(decrypt(session))
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid session token" },
        { status: 401 }
      )
    }

    const userId = sessionData.userId
    const isAdmin = sessionData.isAdmin || sessionData.huntmasterAdmin

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      )
    }

    // Get the win record to check ownership
    const win = await supabaseAdmin.userWins.findById(id)
    
    if (!win) {
      return NextResponse.json(
        { success: false, error: "Win not found" },
        { status: 404 }
      )
    }

    // Check authorization: user must own the win OR be an admin
    if (!isAdmin && win.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You can only delete your own wins" },
        { status: 403 }
      )
    }

    // Delete the win
    await supabaseAdmin.userWins.delete(id)

    console.log(`✅ Win deleted: ${id} by ${isAdmin ? 'admin' : 'user'} ${userId}`)

    return NextResponse.json({
      success: true,
      message: "Win deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting win:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to delete win",
      },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"


