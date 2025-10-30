import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.SLOT_STREAMERS_API_KEY;
  const apiUrl = process.env.SLOT_STREAMERS_API_URL;

  if (!apiKey || !apiUrl) {
    return NextResponse.json({
      success: false,
      error: "Missing SLOT_STREAMERS_API_KEY or SLOT_STREAMERS_API_URL in environment variables."
    }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "/stats"; // default to stats endpoint per guide

    // Build target URL with all query params except 'path'
    const passthrough = new URLSearchParams(searchParams);
    passthrough.delete("path");
    const qs = passthrough.toString();
    const targetUrl = `${apiUrl}${path}${qs ? `?${qs}` : ""}`;

    const response = await fetch(targetUrl, {
      headers: {
        "x-api-key": apiKey,
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      url: targetUrl,
      data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
