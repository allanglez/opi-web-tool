FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile=false

RUN pnpm --filter web build

# Generate env-config.js from build args (used by Dokploy / docker-compose).
# In K8s this file is overridden at runtime by a ConfigMap subPath mount.
ARG VITE_API_URL=""
ARG VITE_API_BASE_URL=""
ARG VITE_AUTH_MODE="auth0"
ARG VITE_AUTH0_DOMAIN=""
ARG VITE_AUTH0_CLIENT_ID=""
ARG VITE_AUTH0_AUDIENCE=""
ARG VITE_AUTH0_REDIRECT_URI=""
RUN printf 'window.__ENV__ = {\n\
  VITE_API_URL: "%s",\n\
  VITE_API_BASE_URL: "%s",\n\
  VITE_AUTH_MODE: "%s",\n\
  VITE_AUTH0_DOMAIN: "%s",\n\
  VITE_AUTH0_CLIENT_ID: "%s",\n\
  VITE_AUTH0_AUDIENCE: "%s",\n\
  VITE_AUTH0_REDIRECT_URI: "%s"\n\
};\n' \
  "$VITE_API_URL" "$VITE_API_BASE_URL" "$VITE_AUTH_MODE" \
  "$VITE_AUTH0_DOMAIN" "$VITE_AUTH0_CLIENT_ID" "$VITE_AUTH0_AUDIENCE" \
  "$VITE_AUTH0_REDIRECT_URI" > /app/apps/web/dist/env-config.js

FROM nginxinc/nginx-unprivileged:stable-alpine AS production
# Copy static files (includes baked env-config.js for Dokploy)
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Add custom nginx config for SPA fallback routes
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# In K8s, env-config.js is overridden by a ConfigMap subPath mount at:
#   /usr/share/nginx/html/env-config.js

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
