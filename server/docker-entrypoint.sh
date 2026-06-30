#!/bin/sh
set -e

echo "📦 Applying database schema..."
npx prisma db push

echo "👑 Seeding admin user..."
npx ts-node --transpile-only scripts/seed-admin.ts || true

echo "🚀 Starting server..."
exec node dist/index.js
