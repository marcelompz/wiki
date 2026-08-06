#!/bin/sh
# Entrypoint script for production/staging
#
# - Synchronizes the database schema (prisma db push).
# - If a command is passed (e.g. `npx prisma migrate deploy` from the deploy
#   script), it is executed INSTEAD of starting the app. This keeps the
#   schema/migration check isolated from the Nest application startup, which
#   opens its own DB connection pool and can exhaust Postgres connections
#   during a deploy overlap (causing false "Migrations failed" errors).

echo "🚀 Starting OrderFlow Backend..."

echo "📦 Applying database migrations..."
npx prisma migrate deploy || true

if [ "$#" -gt 0 ]; then
  echo "🏁 Running provided command instead of starting the app: $*"
  exec "$@"
fi

echo "🔥 Starting application..."
if [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
elif [ -f "dist/main.js" ]; then
  exec node dist/main.js
else
  exec node dist/src/main.js
fi
