# KLAR Chrome Extension

Manifest V3 browser extension for verifying AI-generated content directly on any webpage.

## Setup

1. Get an API key from [KLAR Settings](https://klar-app.vercel.app/en/settings)
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this `extension/` directory
5. Click the KLAR extension icon and enter your API key

## Features

- **Right-click → Verify**: Select text on any page, right-click, and choose "Verify with KLAR"
- **Page verification**: Right-click anywhere to verify the entire page
- **Inline results**: Trust score and claim breakdown shown in a floating panel
- **Dark mode**: Automatically adapts to system theme
- **API key stored securely**: Uses `chrome.storage.sync` (encrypted by Chrome)

## Architecture

- `manifest.json` — Extension manifest (V3)
- `background.js` — Service worker handling API calls and context menus
- `content.js` + `content.css` — Injected into pages, shows floating results panel
- `popup.html` + `popup.js` — Extension popup for API key configuration
- `sidepanel.html` — Side panel with usage hints

## API

Uses the `/api/extension/scan` endpoint which returns JSON (not SSE).
Requires an API key with `verify` scope.
