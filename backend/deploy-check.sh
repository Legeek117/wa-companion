#!/bin/bash
# ==============================================================
# AMDA Backend - Script de déploiement VPS
# Usage : bash deploy-check.sh
# Répertoire cible : /root/cryptovip/wa-companion/backend
# ==============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_ok()   { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_err()  { echo -e "${RED}❌ $1${NC}"; }
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo ""
echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  AMDA Backend - Vérification déploiement VPS         ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

ERRORS=0

# --------------------------------------------------------------
# 1. Vérifier le fichier .env
# --------------------------------------------------------------
echo "── Étape 1/6 : Vérification du fichier .env ──"

if [ ! -f ".env" ]; then
  log_err "Fichier .env introuvable dans $(pwd)"
  log_info "Copiez .env.production vers .env et remplissez les valeurs :"
  log_info "  cp .env.production .env && nano .env"
  ERRORS=$((ERRORS + 1))
else
  log_ok ".env trouvé"
fi

# --------------------------------------------------------------
# 2. Vérifier les variables obligatoires
# --------------------------------------------------------------
echo ""
echo "── Étape 2/6 : Vérification des variables obligatoires ──"

if [ -f ".env" ]; then
  # Source les variables (en ignorant les commentaires)
  set -a
  # shellcheck disable=SC1090
  source <(grep -v '^\s*#' .env | grep -v '^\s*$')
  set +a

  check_var() {
    local key="$1"
    local value="${!key}"
    if [ -z "$value" ]; then
      log_err "Variable manquante : $key"
      ERRORS=$((ERRORS + 1))
    elif echo "$value" | grep -qE '<|your-|placeholder|change-in-production'; then
      log_warn "Variable avec valeur placeholder : $key"
      ERRORS=$((ERRORS + 1))
    else
      log_ok "$key défini"
    fi
  }

  check_var "DATABASE_URL"
  check_var "JWT_SECRET"
  check_var "JWT_REFRESH_SECRET"
  check_var "NODE_ENV"
  check_var "API_URL"
  check_var "FRONTEND_URL"
fi

# --------------------------------------------------------------
# 3. Vérifier Node.js et npm
# --------------------------------------------------------------
echo ""
echo "── Étape 3/6 : Vérification de Node.js et npm ──"

if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  log_ok "Node.js $NODE_VER"
  # Vérifier Node >= 18
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 18 ]; then
    log_warn "Node.js >= 18 recommandé (actuel : $NODE_VER)"
  fi
else
  log_err "Node.js non trouvé"
  ERRORS=$((ERRORS + 1))
fi

if command -v npm &>/dev/null; then
  log_ok "npm $(npm --version)"
else
  log_err "npm non trouvé"
  ERRORS=$((ERRORS + 1))
fi

# --------------------------------------------------------------
# 4. Vérifier PM2
# --------------------------------------------------------------
echo ""
echo "── Étape 4/6 : Vérification de PM2 ──"

if command -v pm2 &>/dev/null; then
  log_ok "PM2 $(pm2 --version)"
else
  log_warn "PM2 non installé — installation en cours..."
  npm install -g pm2
  log_ok "PM2 installé"
fi

# --------------------------------------------------------------
# 5. Arrêt anticipé si variables manquantes
# --------------------------------------------------------------
if [ "$ERRORS" -gt 0 ]; then
  echo ""
  log_err "$ERRORS erreur(s) bloquante(s) détectée(s). Corrigez-les avant de continuer."
  echo ""
  echo "  → Editez le fichier .env : nano .env"
  echo "  → Pour générer des secrets JWT : node scripts/generate-jwt-secrets.js"
  echo ""
  exit 1
fi

# --------------------------------------------------------------
# 6. Installation des dépendances + build + migration DB
# --------------------------------------------------------------
echo ""
echo "── Étape 5/6 : Installation et build ──"

log_info "Installation des dépendances npm..."
npm install --omit=dev
log_ok "Dépendances installées"

log_info "Génération du client Prisma..."
npx prisma generate
log_ok "Client Prisma généré"

log_info "Application du schéma Prisma sur la base de données..."
npx prisma db push --accept-data-loss
log_ok "Schéma Prisma appliqué"

log_info "Compilation TypeScript..."
npm run build
log_ok "Build terminé (dist/ créé)"

# Créer les répertoires nécessaires
mkdir -p ./uploads/deleted-messages ./uploads/view-once ./sessions
log_ok "Répertoires uploads/ et sessions/ créés"

# --------------------------------------------------------------
# 7. Démarrage / redémarrage PM2
# --------------------------------------------------------------
echo ""
echo "── Étape 6/6 : Démarrage avec PM2 ──"

if pm2 describe amda-backend &>/dev/null; then
  log_info "Processus 'amda-backend' existant détecté — redémarrage..."
  pm2 restart amda-backend --update-env
  log_ok "amda-backend redémarré"
else
  log_info "Démarrage du processus 'amda-backend'..."
  pm2 start dist/server.js --name amda-backend \
    --max-memory-restart 512M \
    --restart-delay 3000 \
    --max-restarts 10
  log_ok "amda-backend démarré"
fi

pm2 save
log_ok "Configuration PM2 sauvegardée (survit aux reboots)"

# Activer PM2 au démarrage système si possible
pm2 startup 2>/dev/null || log_warn "Lancez 'pm2 startup' manuellement pour activer le démarrage automatique"

# --------------------------------------------------------------
# Résumé final
# --------------------------------------------------------------
echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  Déploiement terminé avec succès !                   ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""
log_info "Vérifiez que le backend répond :"
echo "  curl http://localhost:${PORT:-3000}/health"
echo ""
log_info "Surveiller les logs en temps réel :"
echo "  pm2 logs amda-backend"
echo ""
log_info "Statut du processus :"
pm2 status amda-backend
echo ""
