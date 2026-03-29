# Changelog

All notable changes to Swiparr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Session hosts can now kick individual members from an active session via the Party section in the session sheet
- Kicked members receive a real-time notification and are redirected to the login screen
- Kick confirmation dialog with a persistent "don't ask again" option

## [1.3.4] - 2026-03-02

Upstream sync: merged upstream swiparr v1.2.13 through v1.3.4 into fork.

### Added
- Animated heart background on match overlay (upstream v1.2.13)
- New `alert-dialog`, `item`, and `separator` UI primitives
- SSE event service (`src/lib/services/event-service.ts`) for proper real-time event handling (upstream v1.3.0)
- URL security guard (`src/lib/security/url-guard.ts`) for hardened URL validation (upstream v1.3.3)
- New DB migration `0012_useful_omega_flight` (auto-applied on build)
- `AI_USAGE_DECLARATION` and `SECURITY_AUDIT.md` documents (upstream v1.3.2/v1.3.3)
- UUID generator fallback for insecure (non-HTTPS) contexts (upstream v1.3.2)

### Changed
- Plex discovery simplified — auto server URL discovery removed; explicit URL required (upstream v1.3.3)
- Events API route (`/api/events`) refactored to use new event service
- Security hardening across `crypto.ts`, Plex auth, and URL handling (upstream v1.3.3)
- `MatchOverlay` now shows animated heart background alongside confetti burst on match

### Fixed
- Slow filter loading on initial render (upstream v1.2.14)
- Custom URL base path support for reverse proxy deployments (upstream v1.2.14)
- `maxDuration` Vercel serverless limit (upstream v1.3.1)
- "No items loaded" bug when opening the deck (upstream v1.3.4)
- Plex authentication bug (upstream v1.3.4)
- Plex IP address and URL matching with multi-server setups (upstream v1.3.3)

## [1.0.3] - 2025-02-06

Various bug fixes and improvements stemming from update to 1.0.0 on existing instances.

## [1.0.0] - 2025-02-06

This release rounds up all work from previous patches and features. It includes:
- Better filters, and more stable features in general
- TMDB (no media server needed), Emby, and Plex support (experimental)
- BYOP (bring your own provider support) lets end users configure their provider
- A better README, with instructions on how to auto deploy on Vercel (no server needed)
- Improved error handling, with specialized pages and UI

### Added
- Emby provider support (experimental)
- FUNDING.yml for project sponsorship

### Changed
- Switched database driver for improved performance
- Cleaned up environment variables for better organization

### Fixed
- Various bug fixes and UI adjustments

## [0.1.65] - 2025-01-28

### Added
- **BYOP Mode** - Bring Your Own Provider support (`PROVIDER_LOCK` environment variable)
  - When `PROVIDER_LOCK=false`, users can connect their own media providers
  - Enables sessions with mixed provider types (e.g., Jellyfin + Plex + TMDB)
  - Perfect for friends with different media servers

## [0.1.64] - 2025-01-25

### Added
- **Plex integration** (experimental, basic support)
- **TMDB provider** - Use Swiparr without any media server (standalone mode)
- Streaming services information and availability
- Dynamic background effects using masks
- Account section in user settings
- Animated home tabs

### Changed
- Major networking refactor for improved performance and reliability
- Optimized image loading with better visual feedback
- Database initialization now uses singleton pattern

### Fixed
- Fixed "unlike" button bug in likes list
- Fixed quick connect functionality
- Fixed session fundamentals and static filters
- Fixed layout shift issues on mobile
- Fixed memory leaks

## [0.1.51] - 2025-01-15

### Added
- Initial multi-provider architecture abstraction
- Configurable iframe options for embedding
- Static filters configuration

### Changed
- Improved image loading visuals and performance
- Enhanced movie detail view with better line clamping

### Fixed
- Various UI bugs and minor adjustments
- Session handling improvements

## [0.1.50] and Earlier

### Added
- Core swipe interface and matching algorithm
- Jellyfin integration (original provider)
- Session-based multiplayer matching
- Guest lending mode (account sharing)
- Session settings (match strategies, restrictions)
- Admin privileges system
- Mobile-responsive design
- Keyboard shortcuts for desktop
- Watchlist and favorites sync
- Docker containerization

### Changed
- Initial release and early development iterations
- UI/UX refinements based on user feedback

---

## Release Notes Summary

### Major Milestones

**🎉 v0.1.65+ - Universal Platform Era**
- Swiparr evolves from Jellyfin-only to universal media discovery
- Support for Jellyfin, Emby, Plex, and TMDB
- BYOP mode enables mixed-provider sessions
- Cloud hosting at swiparr.com launched

**🚀 v0.1.64 - Provider Expansion**
- TMDB provider enables server-free usage
- Experimental Emby and Plex support added
- Streaming services integration

**📱 v0.1.60-v0.1.63 - Performance & Polish**
- Major networking refactor
- Significant mobile performance improvements
- Enhanced UI/UX with animations and better visuals

**🎯 v0.1.50 and Earlier - Foundation**
- Core swipe and match functionality
- Session-based collaboration
- Initial Docker support

---

## Upcoming Features (Roadmap)

Based on community discussions and planned development:

- [ ] Enhanced Emby and Plex provider support
- [ ] Advanced matching algorithms
- [ ] User profiles and persistent preferences
- [ ] Watch party integration
- [ ] Mobile app (iOS/Android)
- [ ] Export session data and history
- [ ] Custom genres and categories
- [ ] Performance optimizations for large libraries
- [ ] Accessibility improvements (WCAG compliance)

---

## How to Use This Changelog

- **Added**: New features and functionality
- **Changed**: Changes to existing features
- **Deprecated**: Features that will be removed
- **Removed**: Features that have been removed
- **Fixed**: Bug fixes
- **Security**: Security improvements and fixes

For detailed information about each change, see the [GitHub Releases](https://github.com/m3sserstudi0s/swiparr/releases) page or individual commit history.

---

**Did we miss something?** Let us know in the [GitHub Discussions](https://github.com/m3sserstudi0s/swiparr/discussions)!
