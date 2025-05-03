# Changelog

All notable changes to this project will be documented in this file.

## [1.4.1] - 2025-05-02
### Security
- Replaced all unsafe `innerHTML` assignments with secure DOM manipulation methods
- Implemented consistent cross-browser element creation patterns
- Added null checks for storage operations

### Changed
- Version bump to reflect security improvements

## [1.4.0] - 2025-05-02
### Added
- Firefox extension support
- Cross-browser API compatibility layer

## [1.3.1] - 2025-05-01
### Added
- Enter key support for adding domains in popup/manager

## [1.3.0] - 2025-05-01
### Changed
- Rebranded to "Focus Guard"
- Updated all UI messaging to focus on productivity protection
- Improved blocked page design
- Standardized manager interface

## [1.2.2] - 2025-04-29
### Added
- New centered logo in README
- Visual preview of blocked domains in manager

## [1.2.1] - 2025-04-29
### Changed
- Updated remove buttons to use minus sign (-) instead of x
- Improved remove button styling for better visibility
- Added new extension icons in all required sizes (16x16, 48x48, 128x128)

## [1.2.0] - 2025-04-29
### Changed
- Moved image upload functionality exclusively to manager page
- Simplified popup interface

## [1.1.1] - 2025-04-29
### Fixed
- Image storage using local storage instead of sync to avoid quota limits
- Added image compression before storage

## [1.1.0] - 2025-04-29
### Added
- Full management page (`manager.html`)
- Image preview functionality
- Direct link from popup to manager

## [1.0.0] - 2025-04-29
### Added
- Initial release with core functionality:
  - Domain blocking
  - Custom image replacement
  - Popup management UI

## Format
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
and follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.
