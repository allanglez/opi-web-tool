FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile=false

ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_AUTH_MODE=auth0
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_AUTH0_REDIRECT_URI

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AUTH_MODE=${VITE_AUTH_MODE}
ENV VITE_AUTH0_DOMAIN=${VITE_AUTH0_DOMAIN}
ENV VITE_AUTH0_CLIENT_ID=${VITE_AUTH0_CLIENT_ID}
ENV VITE_AUTH0_AUDIENCE=${VITE_AUTH0_AUDIENCE}
ENV VITE_AUTH0_REDIRECT_URI=${VITE_AUTH0_REDIRECT_URI}

RUN pnpm --filter web build

FROM nginxinc/nginx-unprivileged:stable-alpine AS production
# Stage static files (emptyDir will be mounted at /usr/share/nginx/html in K8s)
COPY --chown=nginx:nginx --from=build /app/apps/web/dist /app/static

# Add custom nginx config for SPA fallback routes
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Entrypoint generates env-config.js from K8s environment variables at startup
COPY --chmod=755 apps/web/docker-entrypoint.sh /docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
