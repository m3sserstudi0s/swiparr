# Swiparr 🍿

Swiparr is a fun way to discover what to watch next on your Jellyfin server. Think "Tinder for Movies" – swipe through your library, match with friends in a session, and find something everyone wants to watch!

![License](https://img.shields.io/github/license/messerstudios/swiparr)
![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue)

## Features

- **Swipe Discovery:** Quickly browse your Jellyfin library with a card-based interface.
- **Sessions:** Create or join a session with friends to find common likes (matches!).
- **Native Jellyfin Integration:** Pulls directly from your Jellyfin server.
- **Mobile Friendly:** Optimized for use on your phone.

## Quick Start

The easiest way to run Swiparr is with Docker Compose.

1. Create a `docker-compose.yml` file:

```yaml
services:
  swiparr:
    image: ghcr.io/messerstudios/swiparr:latest
    container_name: swiparr
    restart: unless-stopped
    environment:
      - JELLYFIN_URL=http://your-jellyfin-ip:8096
      - JELLYFIN_PUBLIC_URL=https://jellyfin.yourdomain.com
      - AUTHORS_SECRET=choose_a_long_random_string
    volumes:
      - ./swiparr-data:/app/data
    ports:
      - 4321:4321
```

2. Run the container:
```bash
docker compose up -d
```

3. Access Swiparr at `http://your-server-ip:4321`.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JELLYFIN_URL` | Internal URL to your Jellyfin server (for the backend). | `http://localhost:8096` |
| `JELLYFIN_PUBLIC_URL` | Public URL to your Jellyfin server (for the browser). | - |
| `AUTHORS_SECRET` | Random string for session encryption. | - |
| `JELLYFIN_USE_WATCHLIST` | Set to `true` to use the Jellyfin "Watchlist" instead of "Favorites". | `false` |
| `PORT` | The port the container listens on. | `4321` |

## Community and Support

We use **GitHub Discussions** for everything related to Swiparr!

- 💬 [Ask a question](https://github.com/messerstudios/swiparr/discussions/new?category=q-a)
- 💡 [Propose a feature](https://github.com/messerstudios/swiparr/discussions/new?category=ideas)
- 🐛 [Report a bug](https://github.com/messerstudios/swiparr/discussions/new?category=bugs)
- 🙌 [General discussion](https://github.com/messerstudios/swiparr/discussions/new?category=general)

**Please note:** We are currently not accepting Pull Requests.

## License

Swiparr is released under the [MIT License](LICENSE).
