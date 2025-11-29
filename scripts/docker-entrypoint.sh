#!/bin/sh
set -euo pipefail

echo "🏗  Applying Prisma migrations..."
npx prisma migrate deploy

echo "🚀 Starting Next.js server..."
exec npm run start

