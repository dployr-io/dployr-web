# Dployr Web

This is the web dashboard for [dployr](https://github.com/dployr-io/dployr).

Most users do not need to self-host. The free hosted dashboard is globally available and delivered at low latency via Cloudflare’s edge network:

- Dashboard: https://app.dployr.dev
- Base: https://base.dployr.dev
- Documentation: https://docs.dployr.dev
- API Reference: https://api-docs.dployr.dev

Continue below only if you are in a restricted network or have very special requirements that require deploying and managing your own control plane & web dashboard.

---

## Quick start (self‑hosting)

### Option 1: Docker (simple, recommended)

```bash
docker run --rm -p 7877:80 ghcr.io/dployr-io/dployr-web:latest
```

The UI will be available on `http://localhost:7877`.

### Option 2: Static files (any web server)

```bash
# Download from the GitHub release for vX.Y.Z
curl -fsSL -o dployr-web-vX.Y.Z.tar.gz \
  https://github.com/dployr-io/dployr-web/releases/download/vX.Y.Z/dployr-web-vX.Y.Z.tar.gz

mkdir -p /var/www/dployr-web
tar -xzf dployr-web-vX.Y.Z.tar.gz -C /var/www/dployr-web
```

Point Nginx, Caddy, or any static file server at `/var/www/dployr-web` and serve `index.html` for unknown paths.

---

## Development

```bash
# Install deps
pnpm install

# Dev server
pnpm dev

# Tests
pnpm test

# Lint + types
pnpm lint
pnpm types

# Production build
pnpm build
```

Build output goes to `dist/`.

---

## Links

- Self‑hosting guide: https://docs.dployr.dev/installation/self-hosting

License: Apache 2.0
