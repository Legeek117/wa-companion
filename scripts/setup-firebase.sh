#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# setup-firebase.sh — Active les notifications push FCM.
#
# Usage :
#   1) Dans Firebase Console → Projet (amda-dcf4a) :
#      a) Project settings → Service accounts → "Générer une nouvelle
#         clé privée" → téléchargez le JSON.
#      b) Project settings → Vos applications → Ajoutez une application
#         Android (package : com.amda.app) → téléchargez google-services.json.
#   2) Placez les fichiers ici :
#         ./service-account-firebase.json
#         ./google-services.json
#   3) Lancez :  sudo bash setup-firebase.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SA_SRC="$ROOT/service-account-firebase.json"
GS_SRC="$ROOT/google-services.json"

if [ ! -f "$SA_SRC" ]; then
  echo "❌ Fichier introuvable : $SA_SRC"
  echo "   Téléchargez la clé service account depuis Firebase Console."
  exit 1
fi

# 1. Service account → backend (monté dans le conteneur)
mkdir -p "$ROOT/backend"
cp "$SA_SRC" "$ROOT/backend/firebase-service-account.json"
echo "✔  Service account installé : backend/firebase-service-account.json"

# 2. google-services.json → dossier Android (utilisé par le build APK)
if [ -f "$GS_SRC" ]; then
  mkdir -p "$ROOT/android/app"
  cp "$GS_SRC" "$ROOT/android/app/google-services.json"
  echo "✔  google-services.json installé : android/app/google-services.json"
else
  echo "⚠️  google-services.json absent : l'APK compilera SANS support push."
  echo "   Ajoutez l'application Android 'com.amda.app' dans Firebase Console puis relancez."
fi

# 3. Redémarrage du backend avec le service account
echo "→ Redémarrage du backend..."
docker compose up -d --build backend
sleep 5
docker compose logs --tail=20 backend | grep -i "firebase" || true

echo ""
echo "✔  Terminé. Vérifiez 'Firebase Admin initialized successfully' dans les logs."