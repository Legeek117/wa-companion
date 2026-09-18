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

# ── 1b. Backfill email_verified pour les comptes existants ────
# Les comptes créés avant l'introduction de la vérification email n'ont pas de
# verification_token : on les marque vérifiés. Les comptes nouvellement créés
# (avec token) restent non vérifiés tant qu'ils n'ont pas cliqué le lien.
echo ""
echo "🔁 [Entrypoint] Backfill email_verified pour les comptes pré-existants..."
npx prisma db execute --stdin <<'SQL'
UPDATE "users"
SET email_verified = true
WHERE email_verified = false AND verification_token IS NULL;
SQL
echo "✅ [Entrypoint] Backfill terminé"

# ── 2. Démarrer le serveur ────────────────────────────────────
echo ""
echo "🌐 [Entrypoint] Démarrage du serveur Express..."
exec node dist/server.js
