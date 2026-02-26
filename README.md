<p align="center">
  <img src="github.com/user-attachments/assets/a4189871-ba68-4c6b-b177-1eb3e3f99fdb" alt="Swiparr" width="200" />
</p>

<h1 align="center">Swiparr 🍿</h1>

<p align="center">
  <strong>Discover what to watch next, by yourself or together.</strong>
</p>

<p align="center">
  Swiparr turns the dreaded "what should we watch?" question into a fun, collaborative experience. 
  <br>
  Like Tinder for movies, but smarter and works for groups.
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/m3sserstudi0s/swiparr" alt="License" />
  <img src="https://img.shields.io/badge/docker-ghcr.io-blue" alt="Docker" />
  <a href="https://www.buymeacoffee.com/jakobbjelver" target="_blank">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee" />
  </a>
</p>

---

## 🎯 The Problem

The struggle is real: 30 minutes of "what should we watch?" that ends with watching the same show again. Swiparr fixes this by:

✨ Turning discovery into a fun, game-like experience  
🤝 Finding content everyone actually wants to watch  
⚡ Making group decisions in minutes, not hours  
🌍 Working with your existing media libraries OR standalone  

---

## ✨ Features

### 🎬 Content Discovery
- **Intuitive Swipe Interface** - Browse movies with a familiar card-based design
- **Multi-Provider Support** - Works with Jellyfin, Emby, Plex, or TMDB directly
- **Smart Matching** - Automatically finds content everyone in your group will enjoy
- **Mobile-First** - Optimized for phones, with desktop keyboard shortcuts
- **PWA Ready** - Install as a web app for the best experience

### 👥 Built for Groups
- **Instant Sessions** - Create or join in seconds, no complex setup
- **Flexible Match Rules** - Choose "any two people" or "everyone must agree"
- **Session Controls** - Limit likes, dislikes, or total matches
- **Watchlist Sync** - Seamlessly save favorites back to your media server

### 🔧 Universal Compatibility
- **Jellyfin** - Full native integration
- **Emby** - Experimental support (improving)  
- **Plex** - Experimental support (improving)
- **TMDB** - No media server required, works standalone

---

## 🚀 Quick Start

### Fastest: Swiparr Global

**No setup, no server, no problem.**

🌐 **[swiparr.com](https://swiparr.com)** - Free to use, community-supported (hopefully)

### Easiest: Deploy to Vercel

One-click deployment, perfect for personal or small group use:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fm3sserstudi0s%2Fswiparr&env=PROVIDER,TMDB_ACCESS_TOKEN,USE_SECURE_COOKIES,PROVIDER_LOCK&envDefaults=%7B%22PROVIDER%22%3A%22tmdb%22%2C%22USE_SECURE_COOKIES%22%3A%22true%22%2C%22PROVIDER_LOCK%22%3A%22true%22%7D&envDescription=Get%20a%20TMDB%20Access%20Token%20to%20continue%20with%20TMDB%20(no%20media%20server%20needed)%2C%20or%20set%20another%20PROVIDER%20(jellyfin%2C%20plex%2C%20emby)%2C%20or%20set%20PROVIDER_LOCK%20to%20%22false%22%20to%20configure%20the%20provider%20(any)%20at%20run-time.&envLink=https%3A%2F%2Fgithub.com%2Fm3sserstudi0s%2Fswiparr%3Ftab%3Dreadme-ov-file%23environment-variable-matrix&project-name=swiparr&repository-name=swiparr&demo-title=Swiparr&demo-description=Discover%20what%20to%20watch%20next%2C%20by%20yourself%20or%20together.&demo-url=https%3A%2F%2Fswiparr.com&demo-image=https%3A%2F%2Fswiparr.com%2Ficon1.png&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22tursocloud%22%2C%22productSlug%22%3A%22database%22%2C%22protocol%22%3A%22storage%22%2C%22group%22%3A%22%22%7D%5D)

Note: The automatic deployment workflow in Vercel uses the Turso integration by default as a database service provider. Free to set up, possible to swap out [^1].

**Vercel security note:** `AUTH_SECRET` is auto-generated during the build (via `scripts/ensure-auth-secret.cjs`) and persisted in the database when not provided.



### Full Control: Self-Host with Docker

**Using Docker Compose (Recommended):**

1. Create `docker-compose.yml`:

```yaml
services:
  swiparr:
    image: ghcr.io/m3sserstudi0s/swiparr:latest
    container_name: swiparr
    restart: unless-stopped
    environment:
      - PROVIDER=jellyfin  # or plex, emby, tmdb (or set PROVIDER_LOCK to "false")
      - JELLYFIN_URL=http://your-jellyfin:8096 # adjust to provider, none without server lock
    volumes:
      - ./swiparr-data:/app/data
    ports:
      - 4321:4321
```

2. Run it:
```bash
docker compose up -d
```

**Using Docker CLI:**

```bash
docker run -d \
  --name swiparr \
  --restart unless-stopped \
  -p 4321:4321 \
  -v $(pwd)/swiparr-data:/app/data \
  -e PROVIDER=jellyfin \
  -e JELLYFIN_URL=http://your-jellyfin:8096 \
  ghcr.io/m3sserstudi0s/swiparr:latest
```

3. Open [http://localhost:4321](http://localhost:4321)

**Docker security note:** `AUTH_SECRET` is auto-generated on first boot (via `scripts/ensure-auth-secret.cjs`) and stored in the database when not provided.

---

## ⚙️ Configuration Reference

### Provider-Specific Settings

Choose **one** provider setup based on your needs:

<details>
<summary><strong>Jellyfin Setup</strong></summary>

```env
PROVIDER=jellyfin
JELLYFIN_URL=http://your-jellyfin:8096              # Internal URL (required)
JELLYFIN_PUBLIC_URL=https://jellyfin.example.com    # Public URL (optional)
JELLYFIN_USE_WATCHLIST=false                         # Use Watchlist (plugin needed) vs Favorites (optional)
```
</details>

<details>
<summary><strong>Emby Setup (Experimental)</strong></summary>

```env
PROVIDER=emby
EMBY_URL=http://your-emby:8096        # Internal URL (required)
EMBY_PUBLIC_URL=https://emby.example.com  # Public URL (optional)
```
</details>

<details>
<summary><strong>Plex Setup (Experimental)</strong></summary>

```env
PROVIDER=plex
PLEX_URL=http://your-plex:32400       # Internal URL (required)
PLEX_PUBLIC_URL=https://plex.example.com # Public URL (optional)
```
</details>

<details>
  <summary><strong>TMDB Setup (No Server Required)</strong></summary>

```env
PROVIDER=tmdb
TMDB_ACCESS_TOKEN=your-tmdb-token     # API Read-Only Token (required)
TMDB_DEFAULT_REGION=SE                # Default region for availability/certifications (optional)
```
</details>

### Security & Advanced Options

```env
# Authentication
AUTH_SECRET=random-string-32-chars-min     # Auto-generated on boot/build when not provided. See Security & Privacy.
USE_SECURE_COOKIES=true                    # Required for HTTPS

# Application
PORT=4321                                  # Default port
HOSTNAME=0.0.0.0                          # Bind address
DATABASE_URL=file:/app/data/swiparr.db    # SQLite path or Turso URL
DATABASE_AUTH_TOKEN=your-token            # Required for Turso/Remote DB

# Admin
ADMIN_USERNAME=your-username                      # Global auto-grant admin privileges
JELLYFIN_ADMIN_USERNAME=jelly-admin               # Provider-specific admin (overrides global)
PLEX_ADMIN_USERNAME=plex-admin                   # Provider-specific admin (overrides global)
EMBY_ADMIN_USERNAME=emby-admin                   # Provider-specific admin (overrides global)

# Security Headers
X_FRAME_OPTIONS=DENY                       # Frame control
CSP_FRAME_ANCESTORS=none                   # Embedding policy

# Network Safety
ALLOW_PRIVATE_PROVIDER_URLS=false          # Block private/LAN URLs for user-supplied providers (BYOP)
PLEX_ALLOW_SELF_SIGNED=false               # Allow self-signed TLS for Plex (LAN only)
PLEX_IMAGE_ALLOWED_HOSTS=plex.example.com,*.plex.direct  # Optional extra image hosts

# BYOP Mode - Bring Your Own Provider
PROVIDER_LOCK=false                          # Let users choose and configure their own provider

# Misc
USE_ANALYTICS=false                          # Enable anonymous usage analytics (Vercel deployments)
ENABLE_DEBUG=false                           # Enable verbose debug logging and client-server error mapping
```

### Environment Variable Matrix

| Variable | Required? | Default | Description |
|----------|-----------|---------|-------------|
| `PROVIDER` | ✳️ | `jellyfin` | Primary media provider (`jellyfin`, `tmdb`, `plex`, `emby`) |
| `PROVIDER_LOCK` | ❌ | `true` | If `true`, users cannot change the provider at runtime |
| `JELLYFIN_URL` | ✳️ | - | Internal URL of your Jellyfin server |
| `JELLYFIN_PUBLIC_URL` | ❌ | - | Public URL of your Jellyfin server (for client-side access) |
| `JELLYFIN_USE_WATCHLIST` | ❌ | `false` | Use Jellyfin Watchlist instead of Favorites |
| `EMBY_URL` | ✳️ | - | Internal URL of your Emby server |
| `EMBY_PUBLIC_URL` | ❌ | - | Public URL of your Emby server (for client-side access) |
| `PLEX_URL` | ✳️ | - | Internal URL of your Plex server |
| `PLEX_PUBLIC_URL` | ❌ | - | Public URL of your Plex server (for client-side access) |
| `PLEX_TOKEN` | ❌ | - | Plex Admin/Access Token |
| `TMDB_ACCESS_TOKEN` | ✳️ | - | TMDB API Read-Only Access Token |
| `TMDB_DEFAULT_REGION` | ❌ | `SE` | Default TMDB region (ISO 3166-1) for streaming availability/certifications |
| `AUTH_SECRET` | ❌ | Auto-generated on boot/build | Secret used for session encryption and guest lending token encryption (min 32 chars). See Security & Privacy. |
| `USE_SECURE_COOKIES` | ❌ | `false` | Set to `true` for HTTPS deployments |
| `DATABASE_URL` | ❌ | `file:/app/data/swiparr.db` | SQLite path or Turso URL [^1] |
| `DATABASE_AUTH_TOKEN`| ❌ | - | Auth token for remote databases (e.g. Turso) |
| `APP_PUBLIC_URL` | ❌ | `swiparr.com` | The public domain where the app is hosted |
| `URL_BASE_PATH` | ❌ | - | Base path if running behind a subpath (e.g. `/swiparr`) |
| `ADMIN_USERNAME` | ❌ | - | Global admin username (overrides provider-specific) [^2] |
| `JELLYFIN_ADMIN_USERNAME` | ❌ | - | Jellyfin-specific admin username [^2] |
| `EMBY_ADMIN_USERNAME` | ❌ | - | Emby-specific admin username [^2] |
| `PLEX_ADMIN_USERNAME` | ❌ | - | Plex-specific admin username [^2] |
| `X_FRAME_OPTIONS` | ❌ | `DENY` | Security header: X-Frame-Options |
| `CSP_FRAME_ANCESTORS`| ❌ | `none` | Security header: Content-Security-Policy frame-ancestors |
| `ALLOW_PRIVATE_PROVIDER_URLS` | ❌ | `false` | Allow private/LAN provider URLs for BYOP user inputs |
| `PLEX_ALLOW_SELF_SIGNED` | ❌ | `false` | Allow self-signed TLS for Plex connections |
| `PLEX_IMAGE_ALLOWED_HOSTS` | ❌ | - | Extra allowlist for Plex image hosts (comma-separated). `PLEX_URL`/`PLEX_PUBLIC_URL` are allowed by default. |
| `USE_ANALYTICS` | ❌ | `false` | Enable anonymous usage analytics (Vercel deployments) |
| `ENABLE_DEBUG` | ❌ | `false` | Enable verbose debug logging and client-server error mapping |


[^1]: Can be set to a local file (internal to container) OR external URL. Mostly relevant for Vercel deployments, which uses the Turso integration in the set-up workflow by default where these values are auto-generated and -injected. Can of course be swapped out with a database service provider of choice.

[^2]: Only applicable for providers with authentication (Jellyfin, Plex, Emby). Admin role ownership is tracked per-provider. Defaults to the first user of that provider that logs in (if supported), or matching env vars. Admin capabilities are disabled for providers without built-in authentication (like TMDB).


✳️ = Required conditionally

---

## Features (Deep dive)

### Session Settings

When you create a session, customize it for your group:

<details>
<summary><strong>Match Strategies</strong></summary>

- **Two or More**: Any two people liking the same content creates a match
  - Best for: Larger groups where majority rules
  - Finding: Quick results, more options

- **Unanimous**: Everyone must like it for a match
  - Best for: Smaller groups wanting guaranteed crowd-pleasers
  - Finding: Fewer but higher-quality matches
</details>

<details>
<summary><strong>Session Restrictions</strong></summary>

- **Max Likes**: Limit right swipes per person
  - Forces thoughtful, selective choices
  - Prevents mindless approval

- **Max Nopes**: Limit left swipes per person
  - Stops serial negativity
  - Encourages open-mindedness

- **Max Matches**: Auto-stop when you have enough options
  - Perfect for when you just need 3-4 solid picks
</details>

<details>
<summary><strong>Guest Lending (Account Sharing)</strong></summary>


**How it works:**

1. Host enables "Guest Lending" in settings
2. Guest joins session with just a name - no account needed
3. Swiparr uses the host's credentials to fetch content
4. Guest gets a unique ID, their swipes are tracked separately
5. Guests cannot access host account or modify settings

**Security note:** Host credentials are stored server-side and encrypted at rest using `AUTH_SECRET` while Guest Lending is enabled. See "Generating `AUTH_SECRET`" in Security & Privacy.

**Perfect for:** Movie nights with friends who don't have media servers
</details>

<details>
<summary><strong>Admin Role</strong></summary>


**Automatically Assigned:** First user to log in for each provider becomes that provider's admin.

**Manual Assignment:** Set `ADMIN_USERNAME` (global) or `[PROVIDER]_ADMIN_USERNAME` (e.g., `JELLYFIN_ADMIN_USERNAME`) environment variables.

**Admin Privileges:**
- Configure included media libraries for the provider
- Manage global provider settings
- Override session restrictions
- Access admin dashboard (only for providers with authentication)
</details>

---

## 🔄 Provider Flexibility: Two Modes

### Server Lock Mode

>PROVIDER_LOCK=true

**One provider, admin-controlled**

- Admin configures ONE provider in environment variables
- All users automatically use this provider
- Best for: Families, roommates, shared media servers

### BYOP Mode

>PROVIDER_LOCK=false

**Bring Your Own Provider**

- Each user connects their own provider during onboarding
- Users can switch providers anytime
- Best for: Users with different media servers, and/or you have none

---

## 🔒 Security & Privacy

- **Generating `AUTH_SECRET` (optional)**:

```bash
# macOS and Linux
openssl rand -base64 32
```

Windows users can use https://generate-secret.vercel.app/32.

- **Encrypted Sessions**: iron-session with secure, encrypted cookies
- **Encrypted Guest Lending Tokens**: host access tokens are encrypted at rest when Guest Lending is enabled
- **Scoped Access**: Guests can only swipe, no account access
- **Data Ownership**: Self-hosted = your data stays on your server
- **Provider Isolation**: No credential sharing in BYOP mode
- **CORS Protection**: Configured for safe media server integration
- **Security Headers**: X-Content-Type-Options, X-XSS-Protection, CSP, Referrer-Policy
- **Network Safety**: Private/LAN provider URLs are blocked by default; enable via `ALLOW_PRIVATE_PROVIDER_URLS`
- **Mode Awareness**: Env-configured providers are trusted when `PROVIDER_LOCK=true`; user-supplied URLs are checked

---

## 🤝 Contributing

**Swiparr is now open for contributions!** 🎉

### How to Contribute

1. **Start with Discussion** - Propose changes before coding
   - [💡 Ideas & Feature Proposals](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=ideas)
   - [🐛 Bug Reports](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=bugs)
2. **Fork & Develop** - After discussion approval
3. **Pull Request** - With clear description and tests

### Development Setup

```bash
git clone https://github.com/m3sserstudi0s/swiparr.git
cd swiparr
npm install
npm run dev          # Start dev server
npm run lint         # Check code style
```

### Contribution Areas

- **Provider Integrations**: Improve Emby/Plex support
- **UI/UX**: Mobile responsiveness, accessibility
- **Performance**: Optimize queries, bundle size
- **Documentation**: Examples, guides, tutorials
- **Testing**: Add test coverage (currently minimal)

**First-time contributors welcome!** Start with "good first issue" discussions.

---

## 💚 Support the Project

Swiparr is free, open source, and community-supported. Your contributions help:

- ☕ [**Buy Me a Coffee**](https://www.buymeacoffee.com/jakobbjelver) - Quick one-time support
- 🌟 **Star on GitHub** - Show your support (it's free!)
- 🏢 **Use swiparr.com** - The hosted version includes infrastructure funding

**All support directly funds development and infrastructure costs.**

---

## 📞 Community & Support

All support, questions, and discussions happen in GitHub Discussions:

| Topic | Link |
|-------|------|
| ❓ Questions & Help | [Ask a Question](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=q-a) |
| 💡 Feature Ideas | [Propose a Feature](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=ideas) |
| 🐛 Bug Reports | [Report a Bug](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=bugs) |
| 🙌 General Chat | [Start a Discussion](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=general) |

---

## 🐳 Docker Advanced Topics

### Reverse Proxy Configuration

**Nginx Example:**

```nginx
location / {
    proxy_pass http://swiparr:4321;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Required Headers:**
- `Host` - Required for Next.js 15+ authentication
- `X-Forwarded-For` - Client IP for logging
- `X-Forwarded-Proto` - Protocol detection

### Volume Management

```yaml
volumes:
  - ./data:/app/data          # Database & cache
  - ./logs:/app/logs          # Optional: Persist logs
```

### Environment File

Use `--env-file .env` with Docker for cleaner configuration management.

---

## 📚 Additional Resources

- **AGENTS.md** - Developer guide and code standards (for contributors)
- **GitHub Releases** - Detailed changelog for each version

---

## 📄 License

**MIT License** - See [LICENSE](LICENSE) file for details

You're free to use, modify, and distribute Swiparr. Commercial use is permitted.

---

<div align="center">

**Made with ❤️ and late nights**

<p>
  <a href="https://swiparr.com">🌐 Swiparr Global</a> • 
  <a href="https://github.com/m3sserstudi0s/swiparr">⭐ GitHub Repo</a> • 
  <a href="https://github.com/m3sserstudi0s/swiparr/discussions">💬 Community</a>
</p>

</div>
