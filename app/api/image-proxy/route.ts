import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ success: false, error: "URL parameter is required" }, { status: 400 });
    }

    // Validate URL is from allowed domains
    try {
      const imageUrl = new URL(url);
      const allowedDomains = [
        "assets.slotslaunch.com",
        "www.slot-streamers.com",
        "slot-streamers.com",
        "gxciioabwrkahdfe.public.blob.vercel-storage.com",
        "res.cloudinary.com",
        "cloudinary.com",
      ];
      
      const isAllowed = allowedDomains.some((domain) => imageUrl.hostname === domain || imageUrl.hostname.endsWith(`.${domain}`));
      
      if (!isAllowed) {
        return NextResponse.json({ success: false, error: "Domain not allowed" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ success: false, error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the image
    const imageResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": url,
      },
      cache: "force-cache",
    });

    if (!imageResponse.ok) {
      return NextResponse.json({ success: false, error: `Failed to fetch image: ${imageResponse.status}` }, { status: imageResponse.status });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to proxy image" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";

