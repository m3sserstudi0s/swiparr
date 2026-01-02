# Swiparr 🍿

Swiparr is a fun way to discover and decide what to watch next from your Jellyfin media library. Think "Tinder for Movies" – swipe through your library, match with friends in a session, and find something everyone wants to watch.

![License](https://img.shields.io/github/license/m3sserstudi0s/swiparr)
![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue)

## Features

- **Swipe discovery:** Quickly browse your Jellyfin library with a card-based interface.
- **Sessions:** Create or join a session with friends to find common likes (matches!).
- **Native Jellyfin integration:** Pulls directly from your Jellyfin server.
- **Mobile friendly:** Optimized for use on your phone.

**Tip**: Download as a web app on mobile, and use the keyboard shortcuts on desktop.

## Quick start

The easiest way to run Swiparr is with Docker Compose.

1. Create a or add to an existing `docker-compose.yml` file (or copy `docker-compose.example.yml`):

```yaml
services:
  swiparr:
    image: ghcr.io/m3sserstudi0s/swiparr:latest
    container_name: swiparr
    restart: unless-stopped
    environment:
      - JELLYFIN_URL=http://your-jellyfin-internal-ip:8096
      - JELLYFIN_PUBLIC_URL=https://jellyfin.yourdomain.com
      - AUTH_SECRET=your_32_character_random_string
    volumes:
      - ./swiparr-data:/app/data
    ports:
      - 4321:4321
```

> **Note:** Generate a secure `AUTH_SECRET` using `openssl rand -hex 32`.

2. Run the container:
```bash
docker compose up -d
```

3. Access Swiparr at `http://your-server-ip:4321`.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JELLYFIN_URL` | **Required.** Internal URL to your Jellyfin server. | - |
| `JELLYFIN_PUBLIC_URL` | **Required.** Public URL to your Jellyfin server. | - |
| `AUTH_SECRET` | **Required.** Random string (min 32 chars) for encryption. | - |
| `JELLYFIN_USE_WATCHLIST` | Set to `true` to use "Watchlist" instead of "Favorites". | `false` |
| `USE_SECURE_COOKIES` | Set to `true` if you are accessing Swiparr over HTTPS. | `false` |
| `DATABASE_URL` | Path to the SQLite database file. | `file:/app/data/swiparr.db` |
| `PORT` | The port the container listens on. | `4321` |

## Self-hosting tips

### Reverse proxy
If you are running Swiparr behind a reverse proxy (Nginx, Traefik, Caddy), ensure you:
1. Set `USE_SECURE_COOKIES=true` in your environment variables.
2. Forward the correct headers (`Host`, `X-Real-IP`, `X-Forwarded-For`).
3. Swiparr runs on port `4321` by default.

### Internal vs public Jellyfin URL
- **`JELLYFIN_URL`**: Used by the Swiparr backend to talk to Jellyfin. Use an internal IP or Docker service name (e.g., `http://192.168.1.10:8096`).
- **`JELLYFIN_PUBLIC_URL`**: Used by your browser to load images and handle authentication redirects. Use your public domain (e.g., `https://jellyfin.example.com`).

## Community and support

I use **GitHub discussions** for everything related to Swiparr

- 💬 [Ask a question](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=q-a)
- 💡 [Propose a feature](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=ideas)
- 🐛 [Report a bug](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=bugs)
- 🙌 [General discussion](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=general)

**Please note:** I am currently not accepting pull requests.

## License

Swiparr is released under the [MIT License](LICENSE).
