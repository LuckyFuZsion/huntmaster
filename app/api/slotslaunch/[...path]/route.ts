// DISABLED: this catch-all proxy made paid external API calls.
// The main /api/slotslaunch route serves the same data from the database.
import { NextResponse } from "next/server";

const gone = () => NextResponse.json({ success: false, error: "This endpoint has been removed" }, { status: 410 });

export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
