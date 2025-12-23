// ❌ DISABLED: This route made external API calls and has been disabled
// The main /api/slotslaunch route uses the database instead
// This catch-all proxy route is no longer needed
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  return forward(request, params.path);
}

export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  return forward(request, params.path);
}

export async function PUT(request: Request, { params }: { params: { path: string[] } }) {
  return forward(request, params.path);
}

export async function PATCH(request: Request, { params }: { params: { path: string[] } }) {
  return forward(request, params.path);
}

export async function DELETE(request: Request, { params }: { params: { path: string[] } }) {
  return forward(request, params.path);
}










