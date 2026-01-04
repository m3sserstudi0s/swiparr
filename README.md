# Swiparr 🍿

Swiparr is a fun way to discover and decide what to watch next from your **Jellyfin** or **Plex** Movies library. Think "Tinder for Movies" – swipe through your library, match with friends in a session, and find something everyone wants to watch.

It's a web app built with Next.js, connects to your Jellyfin or Plex server, and is available to host as a docker container. 
Open source and free forever.

![License](https://img.shields.io/github/license/m3sserstudi0s/swiparr)
![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue)

![swiparr_6](https://github.com/user-attachments/assets/86617fda-1ed5-4637-bb13-1c00cc5a443c)

## Features

- **Swipe discovery:** Quickly browse your Jellyfin or Plex library with a card-based interface.
- **Sessions:** Create or join a session with friends to find common likes (matches!).
- **Native Jellyfin and Plex integration:** Pulls directly from your media server.
- **Plex PIN Authentication:** Sign in using your Plex account via OAuth-style PIN flow.
- **Guest Mode:** Let friends join your session without needing their own account by "lending" your connection temporarily.
- **Mobile friendly:** Optimized for use on your phone.

**Highly recommended**: Download as a web app on mobile, and use the keyboard shortcuts on desktop.

To make your final choice, use the **Random button** to pick a movie from your matches!

## Guest Access & Account Lending

Swiparr includes a **Guest Mode** designed for situations where some participants don't have a Jellyfin or Plex account. 

### How it works:
1. **Enable Lending**: A host (with a Jellyfin or Plex account) enables "Guest lending" in their Swiparr settings.
2. **Proxy Connection**: When guests join that host's session, Swiparr uses the host's credentials to fetch movie data and images from the media server.
3. **Identity**: Guests choose a display name and get a unique ID. Their likes and matches are tracked separately from the host.
4. **Security**: Guests can only swipe within the session. They cannot modify the host's media server account, favorites, or settings.

This makes it easy to host movie nights with guests who aren't part of your home lab ecosystem.

## Session Settings

When you create a session, you can customize how it behaves to fit your group's movie night:

### Match Strategies
- **Two or more**: A match is created as soon as any two people in the session like the same movie. Great for larger groups.
- **Unanimous**: Every single person in the session must like the movie for it to appear in the matches list.

### Restrictions
- **Max Likes**: Limit how many "Right Swipes" each person gets. This forces everyone to be more selective.
- **Max Nopes**: Limit how many "Left Swipes" each person gets. Useful if you want to prevent people from just saying no to everything!
- **Max Matches**: Automatically stop the session once a certain number of matches have been found.

## Quick start


The easiest way to run Swiparr is with Docker Compose.

### Docker Compose for Jellyfin

```yaml
services:
  swiparr:
    image: ghcr.io/m3sserstudi0s/swiparr:latest
    container_name: swiparr
    restart: unless-stopped
    environment:
      - JELLYFIN_URL=http://your-jellyfin-internal-ip:8096
      # - JELLYFIN_PUBLIC_URL=https://jellyfin.yourdomain.com
    volumes:
      - ./swiparr-data:/app/data
    ports:
      - 4321:4321
```

3. Access Swiparr at `http://your-server-ip:4321`.

### Docker Compose for Plex (Recommended)

1. Create a `docker-compose.yml` file:

```yaml
services:
  swiparr:
    image: ghcr.io/m3sserstudi0s/swiparr:latest
    container_name: swiparr
    restart: unless-stopped
    environment:
      - PLEX_URL=http://your-plex-internal-ip:32400
      # - PLEX_PUBLIC_URL=https://plex.yourdomain.com
    volumes:
      - ./swiparr-data:/app/data
    ports:
      - 4321:4321
```
2. Make sure that ./swiparr-data is owned by UID 1001:65533 or is writable by this user (`sudo chmod -R 1001:65533 ./swiparr-data`)

3. Run the container:
```bash
docker compose up -d
```

### Docker CLI for Plex

1. Make sure that ./swiparr-data is owned by UID 1001:65533 or is writable by this user (`sudo chmod -R 1001:65533 ./swiparr-data`).

2. Run the command:

```bash
docker run -d \
  --name swiparr \
  --restart unless-stopped \
  -p 4321:4321 \
  -v $(pwd)/swiparr-data:/app/data \
  -e PLEX_URL=http://your-plex-internal-ip:32400 \
  ghcr.io/m3sserstudi0s/swiparr:latest
```

### Docker CLI for Jellyfin

1. Make sure that ./swiparr-data is owned by UID 1001:65533 or is writable by this user (`sudo chmod -R 1001:65533 ./swiparr-data`).

2. Run the command:

```bash
docker run -d \
  --name swiparr \
  --restart unless-stopped \
  -p 4321:4321 \
  -v $(pwd)/swiparr-data:/app/data \
  -e JELLYFIN_URL=http://your-jellyfin-internal-ip:8096 \
  ghcr.io/m3sserstudi0s/swiparr:latest
```



## Configuration

### Jellyfin Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JELLYFIN_URL` | **Required for Jellyfin.** Internal URL to your Jellyfin server. | - |
| `JELLYFIN_PUBLIC_URL` | Optional. Public URL to your Jellyfin server. Defaults to `JELLYFIN_URL`. | - |
| `MEDIA_BACKEND` | Optional. Explicitly set to `plex` or `jellyfin`. Auto-detected from URL. | Auto |
| `AUTH_SECRET` | Optional. Random string (min 32 chars). Generated automatically if not set. | - |
| `JELLYFIN_USE_WATCHLIST` | Set to `true` to use "Watchlist" instead of "Favorites". | `false` |
| `USE_SECURE_COOKIES` | Set to `true` if you are accessing Swiparr over HTTPS. | `false` |
| `DATABASE_URL` | Path to the SQLite database file. | `file:/app/data/swiparr.db` |
| `PORT` | The port the container listens on. | `4321` |
| `HOSTNAME` | The hostname the server binds to. | `0.0.0.0` |
| `ADMIN_USERNAME` | Optional. A Jellyfin username that will always have admin privileges. | - |

> **Note:** Watchlist is not a feature in vanilla Jellyfin, but available either through the Jellyfin Enhanced plugin or Kefwin Tweaks script.

### Plex Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PLEX_URL` | **Required for Plex.** Internal URL to your Plex server. | - |
| `PLEX_PUBLIC_URL` | Optional. Public URL to your Plex server. Defaults to `PLEX_URL`. | - |
| `MEDIA_BACKEND` | Optional. Explicitly set to `plex` or `jellyfin`. Auto-detected from URL. | Auto |
| `AUTH_SECRET` | Optional. Random string (min 32 chars). Generated automatically if not set. | - |
| `USE_SECURE_COOKIES` | Set to `true` if you are accessing Swiparr over HTTPS. | `false` |
| `DATABASE_URL` | Path to the SQLite database file. | `file:/app/data/swiparr.db` |
| `PORT` | The port the container listens on. | `4321` |
| `HOSTNAME` | The hostname the server binds to. | `0.0.0.0` |
| `ADMIN_USERNAME` | Optional. A Plex username that will always have admin privileges. | - |

## Admin Privileges

The first user to log in to Swiparr is automatically appointed as the system administrator. Admins can:
- Configure which libraries are included in discovery.
- Access future admin-only features and management tools.

Alternatively, you can manually assign an admin by setting the `ADMIN_USERNAME` environment variable to a specific Jellyfin or Plex username.

## Self-hosting tips

### Reverse proxy
If you are running Swiparr behind a reverse proxy (Nginx, Traefik, Caddy, Nginx Proxy Manager), ensure you:
1. Set `USE_SECURE_COOKIES=true` in your environment variables if using HTTPS.
2. **CRITICAL:** Ensure your proxy passes the `Host` header to Swiparr. In Nginx, this is `proxy_set_header Host $host;`. Without this, authentication will fail due to Next.js 15 security checks.
3. Forward other standard headers: `X-Forwarded-For`, `X-Forwarded-Proto`.
4. Swiparr runs on port `4321` by default.

### Internal vs public server URL

**For Jellyfin:**
- **`JELLYFIN_URL`**: Internal URL used by the Swiparr backend to communicate with Jellyfin. 
  - If Jellyfin is in the same Docker network, use the container name: `http://jellyfin:8096`.
  - Otherwise, use the internal IP: `http://192.168.1.10:8096`.
  - **Note:** This URL should be accessible from *within* the Swiparr container.
- **`JELLYFIN_PUBLIC_URL`**: The public-facing URL your browser uses to access Jellyfin (e.g., `https://jellyfin.yourdomain.com`). This is used for links and redirects. Defaults to `JELLYFIN_URL` if not provided.

**For Plex:**
- **`PLEX_URL`**: Internal URL used by the Swiparr backend to communicate with Plex. 
  - If Plex is in the same Docker network, use the container name: `http://plex:32400`.
  - Otherwise, use the internal IP: `http://192.168.1.10:32400`.
  - **Note:** This URL should be accessible from *within* the Swiparr container.
- **`PLEX_PUBLIC_URL`**: The public-facing URL your browser uses to access Plex (e.g., `https://plex.yourdomain.com`). This is used for play links. Defaults to `PLEX_URL` if not provided.

## Community and support

I use **GitHub discussions** for everything related to Swiparr

- 💬 [Ask a question](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=q-a)
- 💡 [Propose a feature](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=ideas)
- 🐛 [Report a bug](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=bugs)
- 🙌 [General discussion](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=general)

**Please note:** I am currently not accepting pull requests.

## License

Swiparr is released under the [MIT License](LICENSE).
