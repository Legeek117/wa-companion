#!/bin/sh
# ─────────────────────────────────────────────────────────────
# Entrypoint du conteneur AMDA Backend
# Ordre : db push → démarrage serveur
# ─────────────────────────────────────────────────────────────
set -e

echo "🚀 [Entrypoint] Démarrage AMDA Backend..."
echo "   NODE_ENV : ${NODE_ENV}"
echo "   DATABASE_URL host : $(echo "$DATABASE_URL" | sed 's/:[^:]*@/@/')"

# ── 1. Appliquer le schéma Prisma sur la base de données ──────
echo ""
echo "📦 [Entrypoint] Application du schéma Prisma (db push)..."
npx prisma db push --skip-generate --accept-data-loss
echo "✅ [Entrypoint] Schéma appliqué"

# ── 2. Démarrer le serveur ────────────────────────────────────
echo ""
echo "🌐 [Entrypoint] Démarrage du serveur Express..."
exec node dist/server.js
