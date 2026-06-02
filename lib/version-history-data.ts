export const APP_VERSION = "2.1.0"
export const EXTENSION_VERSION = "3.4.3"

export interface VersionUpdate {
  version: string
  date: string
  changes: string[]
}

export const appVersionHistory: VersionUpdate[] = [
  {
    version: APP_VERSION,
    date: "June 2026",
    changes: [
      "Login page fix: resolved Next.js workspace root detection when multiple lockfiles exist in parent folders",
      "Build fixes: login Suspense boundary and wins-dashboard compile errors",
      "Removed middleware to reduce Vercel invocations; API routes run without extra edge middleware layer",
      "OBS browser sources optimized to rely on Supabase real-time subscriptions instead of polling",
      "Browser extension v3.4.3: Casino Du Puerto support and improved auth (Discord + session token)",
      "Security: Next.js 15.5.7 and dependency vulnerability patches",
    ],
  },
  {
    version: "2.0.0",
    date: "December 2025",
    changes: [
      "Major UI overhaul: Dashboard now matches browser extension's dark blue theme with grid pattern overlay",
      "Browser extension auto-update: Now automatically updates 'Now Playing' widget when valid games are detected",
      "Smart game detection: Extension filters out generic casino terms (casino, lobby, home, etc.) to prevent false updates",
      "Tab locking: Browser extension can now be locked to a specific browser tab for focused game detection",
      "Plan expiration system: Added subscription plan expiration tracking and validation at login",
      "Admin enhancements: Admins can now set and manage user plan expiration dates in the admin panel",
      "User dashboard: Users can now view their subscription plan status and expiration date",
      "Interactive instructions: Complete user guide with tabbed interface and mobile-friendly hamburger menu",
      "Instructions popout: Instructions can now be opened in a new browser tab for better viewing",
      "Edit slot improvements: Edit dialog now shows existing stake value with proper formatting (2 decimal places)",
      "Database optimization: Replaced external API calls with direct Supabase database queries for game suggestions",
      "Improved validation: Enhanced game title validation to prevent invalid names from being detected",
      "Extension theme consistency: All UI elements now use consistent extension-style colors and design",
    ],
  },
  {
    version: "1.3.0",
    date: "March 2025",
    changes: [
      "Fixed capitalization of words with apostrophes (e.g., 'Buffalo's' now displays correctly)",
      "Added version history section to track updates",
      "Improved OBS browser source performance",
      "Enhanced mobile responsiveness",
    ],
  },
  {
    version: "1.2.0",
    date: "February 2025",
    changes: [
      "Added Spider browser source with customizable colors",
      "Added support for Super Bonus toggle when adding slots",
      "Improved scrolling performance in all browser sources",
      "Fixed bug with win amount calculations",
    ],
  },
  {
    version: "1.1.0",
    date: "January 2025",
    changes: [
      "Added multiple OBS browser source styles (OBS 1-8)",
      "Added customizable font sizes and styles",
      "Implemented widget system for progress bar, top wins, etc.",
      "Improved data persistence",
    ],
  },
  {
    version: "1.0.0",
    date: "December 2024",
    changes: [
      "Initial release",
      "Basic bonus hunt tracking functionality",
      "OBS browser source integration",
      "User authentication system",
    ],
  },
]

export const extensionVersionHistory: VersionUpdate[] = [
  {
    version: EXTENSION_VERSION,
    date: "June 2026",
    changes: [
      "Added Casino Du Puerto (casinodupuerto.com) game detection",
      "Restored visible session token login alongside Discord OAuth",
      "Fixed configuration load so unsaved session tokens are not cleared when a game is detected",
      "Improved auth fallback when Discord login is unavailable",
    ],
  },
  {
    version: "3.4.0",
    date: "February 2026",
    changes: [
      "Extension v3.4 release packages (ZIP) for manual install and distribution",
      "Aligned with HuntMaster app middleware and API route updates",
      "Continued improvements to popup UI and game detection reliability",
    ],
  },
  {
    version: "3.0.0",
    date: "February 2026",
    changes: [
      "Major v3 extension line: restructured packaged builds (v3.0.0+ ZIP releases)",
      "Expanded content script and popup feature set for bonus hunt workflow",
      "Collect bonuses flow and inline editable detected game fields",
    ],
  },
  {
    version: "2.0.3",
    date: "December 2025",
    changes: [
      "Fixed recent games list when extension is opened in a dedicated window",
      "Removed polling from popup; updates driven by content script detection",
      "Improved SPA navigation detection via History API interceptors",
      "Added bc.game and Vave casino support",
    ],
  },
  {
    version: "2.0.2",
    date: "November 2025",
    changes: [
      "CryptoCasino parsing improvements (strip 'Play' prefix from titles)",
      "Loose provider matching (e.g. Pragmatic matches Pragmatic Play)",
      "Prevent auto-fill from overwriting manual game input",
      "NLC provider mapping and improved error handling",
    ],
  },
  {
    version: "2.0.0",
    date: "November 2025",
    changes: [
      "HuntMaster 2.0 extension rebrand and manifest v3 baseline",
      "Automatic game detection for supported casino sites",
      "Now Playing widget sync and session token authentication",
    ],
  },
]
