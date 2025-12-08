import { NextResponse } from "next/server";
import { getApiStats } from "../slots-suggest/route";

export async function GET() {
  try {
    const stats = getApiStats();
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


