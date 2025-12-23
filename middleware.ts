import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Allow all requests to proceed normally
  // Note: This middleware runs on every request, but we filter out static assets
  // in the config matcher to reduce unnecessary invocations
  return NextResponse.next()
}

// Configure which paths should run middleware
// This significantly reduces middleware invocations by excluding:
// - Static assets (_next/static, images, fonts, etc.)
// - API routes (handled separately)
// - Favicon and other common static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - these don't need middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * 
     * Note: Static file extensions are typically served from _next/static
     * so they're already excluded by the _next/static exclusion above.
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
