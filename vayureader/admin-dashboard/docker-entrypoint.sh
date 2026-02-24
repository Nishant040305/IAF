#!/bin/sh

# =============================================================================
# Docker Entrypoint for Admin Dashboard
# Generates env-config.js at runtime from environment variables
# so that the React app can read them without rebuilding.
# =============================================================================

# Generate the runtime config file
cat <<EOF > /usr/share/nginx/html/env-config.js
// Auto-generated at container startup — do NOT edit manually.
window.__ENV__ = {
  REACT_APP_API_BASE_URL: "${REACT_APP_API_BASE_URL:-}",
  HTTPS: "${HTTPS:-true}",
};
EOF

echo "[entrypoint] Generated env-config.js with REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL:-}"

# Start Nginx
exec nginx -g "daemon off;"
