#!/bin/sh
# Copy staged static files into the writable volume (emptyDir in K8s)
cp -a /app/static/. /usr/share/nginx/html/

# Generate runtime env config from K8s/container environment variables.
# Only VITE_* vars are injected so they're available to the SPA at runtime.
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_API_URL: "${VITE_API_URL:-}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-}",
  VITE_AUTH_MODE: "${VITE_AUTH_MODE:-auth0}",
  VITE_AUTH0_DOMAIN: "${VITE_AUTH0_DOMAIN:-}",
  VITE_AUTH0_CLIENT_ID: "${VITE_AUTH0_CLIENT_ID:-}",
  VITE_AUTH0_AUDIENCE: "${VITE_AUTH0_AUDIENCE:-}",
  VITE_AUTH0_REDIRECT_URI: "${VITE_AUTH0_REDIRECT_URI:-}"
};
EOF

echo "[env-config] Generated /usr/share/nginx/html/env-config.js"

exec "$@"
