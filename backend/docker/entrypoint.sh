#!/bin/sh
# ─────────────────────────────────────────────────────────────
# Entrypoint du conteneur AMDA Backend
# Ordre : db push → seed admins → démarrage serveur
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

# ── 2. Créer les comptes admin (idempotent) ───────────────────
echo ""
echo "👤 [Entrypoint] Initialisation des comptes admin..."
node dist/scripts/seed-admins.js 2>/dev/null || \
  npx ts-node --skipProject scripts/seed-admins.ts 2>/dev/null || \
  echo "⚠️  [Entrypoint] Seed admin ignoré (sera relancé au prochain démarrage)"
echo "✅ [Entrypoint] Comptes admin prêts"

# ── 3. Démarrer le serveur ────────────────────────────────────
echo ""
echo "🌐 [Entrypoint] Démarrage du serveur Express..."
exec node dist/server.js
