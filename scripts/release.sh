#!/usr/bin/env bash
# =============================================================================
# AMDA - Script de release
#
# Une commande pour :
#   1. Incrémenter la version de l'APK (versionCode / versionName dans build.gradle)
#   2. Construire le frontend (avec VITE_APP_VERSION / VITE_APP_VERSION_CODE)
#   3. Compiler l'APK (gradle assembleRelease)
#   4. Copier l'APK vers releases/AMDA-v{version}.apk
#   5. Publier la version en BDD (GET/POST /api/version) pour déclencher
#      le bouton "Mettre à jour" dans l'application
#
# Usage:
#   VERSION_NAME=1.1 VERSION_CODE=2 NOTES="Corrections..." \
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
#   DOWNLOAD_URL="https://.../AMDA-v1.1.apk" \
#   ./scripts/release.sh
#
# Variables optionnelles :
#   API_URL     (défaut: https://amda.180.149.197.43.nip.io)
#   ANDROID_HOME / JAVA_HOME (défaut: ~/Android/sdk et java-21-openjdk)
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION_NAME="${VERSION_NAME:-}"
VERSION_CODE="${VERSION_CODE:-}"
NOTES="${NOTES:-}"
DOWNLOAD_URL="${DOWNLOAD_URL:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
API_URL="${API_URL:-https://amda.180.149.197.43.nip.io}"

if [ -z "$VERSION_NAME" ] || [ -z "$VERSION_CODE" ]; then
  echo "❌ VERSION_NAME et VERSION_CODE sont requis."
  echo "   ex: VERSION_NAME=1.1 VERSION_CODE=2 ./scripts/release.sh"
  exit 1
fi

if [ -z "$DOWNLOAD_URL" ]; then
  echo "❌ DOWNLOAD_URL est requis (URL publique de l'APK)."
  exit 1
fi

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "❌ ADMIN_EMAIL et ADMIN_PASSWORD sont requis (pour publier la version en BDD)."
  exit 1
fi

echo "=================================================="
echo "🚀 Release AMDA v${VERSION_NAME} (code ${VERSION_CODE})"
echo "=================================================="

# 1. Bump build.gradle --------------------------------------------------------
BUILD_GRADLE="android/app/build.gradle"
if grep -q "versionCode " "$BUILD_GRADLE"; then
  sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/" "$BUILD_GRADLE"
fi
if grep -q "versionName " "$BUILD_GRADLE"; then
  sed -i "s/versionName \"[^\"]*\"/versionName \"$VERSION_NAME\"/" "$BUILD_GRADLE"
fi
echo "✅ build.gradle: versionCode=$VERSION_CODE, versionName=\"$VERSION_NAME\""

# 2. Build frontend -----------------------------------------------------------
echo "🔨 Build frontend (VITE_APP_VERSION=$VERSION_NAME, VITE_APP_VERSION_CODE=$VERSION_CODE)..."
VITE_APP_VERSION="$VERSION_NAME" VITE_APP_VERSION_CODE="$VERSION_CODE" npm run build

# 3. Build APK -----------------------------------------------------------------
echo "📦 Build APK (gradle)..."
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/sdk}"
JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(
  cd android
  ANDROID_HOME="$ANDROID_HOME" JAVA_HOME="$JAVA_HOME" ./gradlew assembleRelease
)
rm -f android/local.properties

APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_SRC" ]; then
  echo "❌ APK introuvable: $APK_SRC"
  exit 1
fi

mkdir -p releases
APK_DEST="releases/AMDA-v${VERSION_NAME}.apk"
cp "$APK_SRC" "$APK_DEST"
echo "✅ APK copié: $APK_DEST ($(du -h "$APK_DEST" | cut -f1))"

# 5. Publier la version en BDD -------------------------------------------------
echo "🌐 Publication de la version sur l'API ($API_URL)..."
LOGIN_JSON="$(curl -sS -X POST "$API_URL/api/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")"

TOKEN="$(printf '%s' "$LOGIN_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
if [ -z "$TOKEN" ]; then
  echo "❌ Échec du login admin : $LOGIN_JSON"
  exit 1
fi

PAYLOAD="$(node -e "
const p = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(JSON.stringify(p));
" <<< "$(node -e 'console.log(JSON.stringify({
  versionName: process.argv[1],
  versionCode: Number(process.argv[2]),
  downloadUrl: process.argv[3],
  notes: process.argv[4] || undefined
}))' "$VERSION_NAME" "$VERSION_CODE" "$DOWNLOAD_URL" "$NOTES")"
)"

RESP="$(curl -sS -X POST "$API_URL/api/version" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "$PAYLOAD")"
echo "$RESP" | grep -q '"success":true' && echo "✅ Version publiée en BDD." || { echo "⚠️ Réponse API : $RESP"; }

echo "=================================================="
echo "✅ Release terminée. Étapes restantes recommandées :"
echo "   git add android/app/build.gradle package.json src && git commit -m \"release v${VERSION_NAME}\" && git push <remote> main"
echo "   puis sur le VPS: git pull origin main (backend already served, pas indispensable pour la version frontend web)"
echo "   Distribuer: $APK_DEST ($DOWNLOAD_URL)"
echo "=================================================="