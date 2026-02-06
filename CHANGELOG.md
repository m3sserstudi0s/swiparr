# Changelog

All notable changes to Swiparr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

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
- Cloud hosting at swiparr.app launched

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
