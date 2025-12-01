# Multi-stage build for the dployr web dashboard

FROM node:22-alpine AS builder

WORKDIR /app

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
COPY Caddyfile /etc/caddy/Caddyfile

# Copy built assets
COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
