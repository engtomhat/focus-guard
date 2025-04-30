# Domain Blocker Chrome Extension

Blocks specified domains and shows a custom image instead.

## Features
- Add/remove domains to block list
- Customize the blocked page image
- Supports subdomains (blocks www.reddit.com when reddit.com is blocked)

## Installation
1. Clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this directory

## Usage
1. Click the extension icon
2. Add domains to block (e.g. "reddit.com")
3. Upload a custom image (optional)
4. Try navigating to a blocked domain

## Development
All source files are in the project root. Key files:
- `background.js` - Core blocking logic
- `content.js` - Page detection
- `popup.*` - Management UI
- `blocked.html` - Blocked page template
