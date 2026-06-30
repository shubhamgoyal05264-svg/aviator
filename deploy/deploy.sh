#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== SkyHigh Aviator — VPS Deploy ==="

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not installed. Run: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if [ ! -f .env.production ]; then
  cp deploy/env.production.example .env.production
  echo "📝 Created .env.production — edit passwords, then run again:"
  echo "   nano .env.production"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env.production && set +a

if [ "$POSTGRES_PASSWORD" = "change_this_strong_password_123" ] || [ "$JWT_SECRET" = "change_this_jwt_secret_use_openssl_rand_hex_32" ]; then
  echo "❌ Change POSTGRES_PASSWORD and JWT_SECRET in .env.production first!"
  exit 1
fi

echo "🔨 Building and starting containers (first run may take 5–10 min)..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo ""
echo "✅ Deploy complete!"
echo ""
VPS_IP="${VPS_IP:-$(curl -s --max-time 3 ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_VPS_IP')}"
echo "   🎮 Game:  http://${VPS_IP}"
echo "   👑 Admin: http://${VPS_IP}:${ADMIN_PORT:-8080}"
echo "   🔧 API:   http://${VPS_IP}/api/health"
echo ""
echo "   Admin login: ${ADMIN_EMAIL:-admin@skyhigh.com} / ${ADMIN_PASSWORD:-Admin123!}"
echo ""
echo "   Logs:  docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:  docker compose -f docker-compose.prod.yml down"
