# Multi-stage build for the dployr web dashboard

FROM node:22-alpine AS builder

WORKDIR /app

# API base URL placeholder for the dashboard (baked in at build time)
# Actual value is injected at container runtime via DPLOYR_BASE_URL
ENV VITE_BASE_URL=__DPLOYR_BASE_URL__

# Install pnpm
RUN npm install -g pnpm@9

# Install dependencies using the lockfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the source and build
COPY . .
RUN pnpm run build

# Final runtime image using Caddy to serve the static files
FROM caddy:2-alpine

# Caddy configuration
RUN cat <<'EOF' > /etc/caddy/Caddyfile
:80 {
    root * /usr/share/caddy
    file_server
    try_files {path} /index.html
}
EOF

# Copy built assets
COPY --from=builder /app/dist /usr/share/caddy

# Entry point that injects DPLOYR_BASE_URL into the built assets at runtime
ENV DPLOYR_BASE_URL=""

COPY <<'EOF' /docker-entrypoint.sh
#!/bin/sh
set -e

: "${DPLOYR_BASE_URL:?DPLOYR_BASE_URL environment variable is required (e.g. https://base.example.com)}"

echo "Injecting DPLOYR_BASE_URL: $DPLOYR_BASE_URL"

# Replace placeholder in all JS files
find /usr/share/caddy -type f -name '*.js' -exec sed -i "s|__DPLOYR_BASE_URL__|$DPLOYR_BASE_URL|g" {} +

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
EOF

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
