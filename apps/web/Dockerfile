FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm run build --filter=web

FROM nginx:stable-alpine AS production
# Copy static files to nginx html directory
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Add custom nginx config if necessary
# COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
