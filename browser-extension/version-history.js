// Keep in sync with lib/version-history-data.ts (extension section)
const EXTENSION_VERSION_HISTORY = [
  {
    version: "3.4.3",
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

function renderExtensionVersionHistory() {
  const versionLabel = document.getElementById("extension-version-label")
  const listEl = document.getElementById("version-history-list")
  if (!listEl) return

  const manifestVersion = chrome.runtime.getManifest().version
  if (versionLabel) {
    versionLabel.textContent = `v${manifestVersion}`
  }

  listEl.innerHTML = EXTENSION_VERSION_HISTORY.map((entry) => {
    const items = entry.changes.map((c) => `<li>${c}</li>`).join("")
    return `
      <div class="version-entry">
        <div class="version-entry-header">
          <strong>v${entry.version}</strong>
          <span>${entry.date}</span>
        </div>
        <ul>${items}</ul>
      </div>
    `
  }).join("")
}

document.addEventListener("DOMContentLoaded", renderExtensionVersionHistory)
