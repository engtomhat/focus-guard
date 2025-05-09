<div align="center">
  <img src="chrome/images/icon128.png" width="128" alt="Focus Guard Logo">
  <h1>Focus Guard</h1>
  <p>Browser extension that protects your focus by intercepting distracting websites</p>
</div>

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## Features

✅ **Domain Management**
- Add/remove domains via popup or manager
- Persistent storage of blocked domains

✅ **Custom Block Page**
- Shows original blocked URL
- Displays custom image (set in manager)
- Falls back to default image

✅ **Image Management**
- Upload custom blocked image
- Automatic compression and resizing
- Preview before saving

✅ **Cross-Browser Support**
- Blocks distracting websites across multiple browsers

✅ **Profile Management**
- Manage multiple blocklists
- Switch between profiles
- Automatic migration from old storage format

## Architecture

```mermaid
graph TD
    A[Popup] -->|Quick Add/Remove| B(Domains)
    C[Manager] -->|Full Control| B
    C --> D(Images)
    B --> E[Background]
    D --> E
    E -->|Blocks| F[Web Navigation]
    F -->|Shows| G[Blocked Page]
```

## Installation

### Chrome
#### Web Store
1. Go to [Chrome Web Store](https://chromewebstore.google.com/detail/ppioeifofhgpmcbdpehndajepecngmgp)
2. Click "Add to Chrome"

#### Local
1. Clone this repository
2. Go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `chrome` directory

### Firefox
#### Firefox Add-ons
1. Go to [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/focus-guard-pro/)
2. Click "Add to Firefox"

#### Local
1. Clone this repository
2. Go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select any file in the `firefox` directory

## Usage

- **Popup**: Quick domain management (click extension icon)
- **Manager**: Full configuration (`Open Full Manager` link in popup)

## Acknowledgements
- This project was developed with assistance from AI coding tools
- Special thanks to [Windsurf](https://windsurf.dev) and [DeepSeek](https://deepseek.com) for their coding assistance

## Changelog
See [CHANGELOG.md](CHANGELOG.md) for version history

## Support This Project

If Focus Guard helps you stay productive, consider supporting its development:

[![Buy Me A Coffee](bmc-logo.png)](https://www.buymeacoffee.com/tomhat)

Your support helps maintain and improve this extension!

## Privacy Notes
🔍 Focus Guard is designed to block distracting websites, not tracking requests.  
- Allows common tracking paths (e.g., `facebook.com/tr/`) to maintain site functionality
- No user activity data is collected by the extension itself

## License
GNU General Public License v3.0 - See [LICENSE](LICENSE) for full text
