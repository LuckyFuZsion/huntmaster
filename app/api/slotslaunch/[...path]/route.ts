// ⚠️ WARNING: This route still makes external API calls and costs money ($0.01-0.02 per call)
// Consider migrating to database queries instead
// The main /api/slotslaunch route has been migrated to use the database
import { NextResponse } from "next/server";

const BASE = (process.env.SLOTSLAUNCH_API_BASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SLOTSLAUNCH_API_KEY;

function buildTargetUrl(request: Request, pathSegments: string[]): string {
  const incoming = new URL(request.url);
  const rest = pathSegments.join("/");
  const qs = incoming.searchParams.toString();
  const base = BASE || "";
  return `${base}/${rest}${qs ? `?${qs}` : ""}`;
}

async function forward(request: Request, pathSegments: string[], init?: RequestInit) {
  if (!BASE || !KEY) {
    return NextResponse.json({ success: false, error: "SlotsLaunch env not configured" }, { status: 500 });
  }
  const target = buildTargetUrl(request, pathSegments);

  const headers = new Headers(request.headers);
  headers.set("x-api-key", KEY);

  // Remove host and other hop-by-hop headers
  headers.delete("host");
  headers.delete("content-length");

  const res = await fetch(target, {
    method: request.method,
    headers,
    body: init?.body ?? (request.method === "GET" || request.method === "HEAD" ? undefined : await request.clone().arrayBuffer()),
    redirect: "manual",
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  return NextResponse.json({ success: res.ok, status: res.status, url: target, data: body }, { status: res.status });
}

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










