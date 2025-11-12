# 🚀 Guide de Déploiement en Production - AMDA

Ce guide vous explique comment déployer AMDA en production avec :
- **Frontend** sur **Netlify**
- **Backend** sur **Render**
- Configuration complète des routes et variables d'environnement

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Architecture de Production](#architecture-de-production)
3. [Déploiement Backend sur Render](#déploiement-backend-sur-render)
4. [Déploiement Frontend sur Netlify](#déploiement-frontend-sur-netlify)
5. [Configuration des Variables d'Environnement](#configuration-des-variables-denvironnement)
6. [Configuration CORS et Routes](#configuration-cors-et-routes)
7. [Stockage Persistant (Sessions WhatsApp)](#stockage-persistant-sessions-whatsapp)
8. [Utilisateurs Multiples et Scalabilité](#utilisateurs-multiples-et-scalabilité)
9. [Vérification et Tests](#vérification-et-tests)
10. [Maintenance et Monitoring](#maintenance-et-monitoring)

---

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Un compte **Netlify** (gratuit) : https://netlify.com
- ✅ Un compte **Render** (gratuit) : https://render.com
- ✅ Un compte **Supabase** (gratuit) : https://supabase.com
- ✅ Un compte **Stripe** (pour les paiements) : https://stripe.com
- ✅ Un compte **Cloudinary** (optionnel, pour le stockage média) : https://cloudinary.com
- ✅ Git configuré et votre code sur GitHub/GitLab

---

## 🏗️ Architecture de Production

```
┌─────────────────┐
│   Netlify       │  Frontend (React + Vite)
│   (Frontend)    │  → https://votre-app.netlify.app
└────────┬────────┘
         │ HTTPS
         │ API Calls
         ▼
┌─────────────────┐
│   Render        │  Backend (Node.js + Express)
│   (Backend)     │  → https://votre-api.onrender.com
└────────┬────────┘
         │
         ├──► Supabase (Database)
         ├──► Redis (Cache, optionnel)
         └──► WhatsApp (via Baileys)
```

**Flux de données :**
1. L'utilisateur accède au frontend sur Netlify
2. Le frontend fait des appels API vers le backend sur Render
3. Le backend communique avec Supabase, Redis, et WhatsApp
4. Les sessions WhatsApp sont stockées sur le disque du serveur Render

---

## 🔧 Déploiement Backend sur Render

### Étape 1 : Préparer le Backend

1. **Créer un fichier `render.yaml`** à la racine du projet :

```yaml
services:
  - type: web
    name: amda-backend
    env: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /health
    plan: starter  # Ou 'free' pour commencer
```

2. **Créer un fichier `backend/.render-build.sh`** (optionnel) :

```bash
#!/bin/bash
cd backend
npm install
npm run build
```

3. **Vérifier que `backend/package.json` contient les scripts nécessaires** :

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "ts-node src/server.ts"
  }
}
```

### Étape 2 : Déployer sur Render

1. **Connecter votre repository GitHub/GitLab à Render** :
   - Allez sur https://dashboard.render.com
   - Cliquez sur "New" → "Web Service"
   - Connectez votre repository

2. **Configuration du service** :
   - **Name** : `amda-backend`
   - **Environment** : `Node`
   - **Build Command** : `cd backend && npm install && npm run build`
   - **Start Command** : `cd backend && npm start`
   - **Plan** : `Starter` (recommandé) ou `Free` (limité)

3. **Variables d'environnement** (voir section dédiée ci-dessous)

4. **Health Check** :
   - **Path** : `/health`
   - Render vérifiera automatiquement que votre serveur répond

5. **Déployer** :
   - Cliquez sur "Create Web Service"
   - Render va builder et déployer votre backend
   - Notez l'URL : `https://amda-backend-xxxx.onrender.com`

### ⚠️ Important : Stockage Persistant

**Render Free Plan** : Le disque est **éphémère** - les sessions WhatsApp seront perdues au redémarrage.

**Solutions :**

#### Option 1 : Render Disk (Recommandé pour production)
- Passez au plan **Starter** ($7/mois)
- Ajoutez un **Persistent Disk** dans les settings
- Montez-le sur `/opt/render/project/src/backend/sessions`
- Modifiez `WHATSAPP_SESSION_PATH` pour pointer vers ce disque

#### Option 2 : Stockage Cloud (Meilleure solution)
- Utilisez **Supabase Storage** ou **AWS S3** pour stocker les sessions
- Modifiez le code pour sauvegarder/charger les sessions depuis le cloud
- Plus fiable et scalable

#### Option 3 : Render Free (Développement uniquement)
- Les sessions seront perdues à chaque redémarrage
- Les utilisateurs devront se reconnecter après chaque redémarrage
- **Non recommandé pour production**

---

## 🌐 Déploiement Frontend sur Netlify

### Étape 1 : Préparer le Frontend

1. **Créer un fichier `netlify.toml`** à la racine du projet :

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

2. **Créer un fichier `_redirects`** dans `public/` (optionnel, si netlify.toml ne fonctionne pas) :

```
/*    /index.html   200
```

3. **Vérifier `vite.config.ts`** pour la configuration de build :

```typescript
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false, // Désactiver en production pour réduire la taille
  },
  // ... reste de la config
});
```

### Étape 2 : Déployer sur Netlify

1. **Méthode 1 : Via GitHub (Recommandé)**
   - Allez sur https://app.netlify.com
   - Cliquez sur "Add new site" → "Import an existing project"
   - Connectez votre repository GitHub
   - **Build settings** :
     - **Build command** : `npm run build`
     - **Publish directory** : `dist`
   - Cliquez sur "Deploy site"

2. **Méthode 2 : Via Netlify CLI**
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod
   ```

3. **Configuration du domaine** :
   - Netlify génère automatiquement : `votre-app-xxxxx.netlify.app`
   - Vous pouvez ajouter un domaine personnalisé dans les settings

### Étape 3 : Variables d'Environnement Netlify

Dans les settings de votre site Netlify :
- **Site settings** → **Environment variables**
- Ajoutez : `VITE_API_URL=https://votre-api.onrender.com`

---

## 🔐 Configuration des Variables d'Environnement

### Backend (Render)

Dans les **Environment Variables** de Render, ajoutez :

#### Variables Requises

```bash
# Server
NODE_ENV=production
PORT=10000
API_URL=https://votre-api.onrender.com
FRONTEND_URL=https://votre-app.netlify.app

# Database - Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:xxxxx@xxxxx.supabase.co:5432/postgres

# JWT (Générez avec: npm run generate-secrets dans backend/)
JWT_SECRET=votre-secret-jwt-tres-long-et-securise
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=votre-refresh-secret-tres-long-et-securise
JWT_REFRESH_EXPIRES_IN=30d

# WhatsApp
WHATSAPP_SESSION_PATH=/opt/render/project/src/backend/sessions
# OU si vous utilisez un disque persistant :
# WHATSAPP_SESSION_PATH=/opt/render/project/src/backend/persistent-disk/sessions
WHATSAPP_SESSION_TIMEOUT=3600000

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_MONTHLY=price_xxxxx
STRIPE_PRICE_ID_YEARLY=price_xxxxx

# Redis (Optionnel mais recommandé)
REDIS_URL=redis://default:xxxxx@xxxxx.redis.cloud:6379
REDIS_HOST=xxxxx.redis.cloud
REDIS_PORT=6379
REDIS_PASSWORD=xxxxx

# Cloudinary (Optionnel, pour le stockage média)
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret
```

#### Variables Optionnelles

```bash
# Logging
LOG_LEVEL=info  # ou 'debug' pour plus de détails

# AWS S3 (Alternative à Cloudinary)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=votre-bucket
AWS_REGION=us-east-1
```

### Frontend (Netlify)

Dans les **Environment Variables** de Netlify :

```bash
VITE_API_URL=https://votre-api.onrender.com
```

**⚠️ Important** : Les variables doivent commencer par `VITE_` pour être accessibles dans le frontend.

---

## 🔄 Configuration CORS et Routes

### Backend CORS (Déjà configuré)

Le fichier `backend/src/app.ts` contient déjà la configuration CORS qui :
- ✅ Autorise `FRONTEND_URL` en production
- ✅ Autorise localhost en développement
- ✅ Gère les credentials (cookies, tokens)

**Vérification** : Assurez-vous que `FRONTEND_URL` dans Render correspond exactement à l'URL Netlify.

### Routes API

Toutes les routes sont préfixées par `/api` :

```
GET  /api/health                    → Health check
POST /api/auth/register             → Inscription
POST /api/auth/login                → Connexion
GET  /api/auth/me                   → Utilisateur actuel
GET  /api/whatsapp/status           → Statut WhatsApp
GET  /api/whatsapp/qr               → QR Code
GET  /api/status                    → Liste des status
GET  /api/view-once                 → View Once captures
GET  /api/deleted-messages          → Messages supprimés
...
```

### Frontend API Configuration

Le fichier `src/lib/api.ts` doit pointer vers votre backend Render :

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

En production, `VITE_API_URL` sera automatiquement remplacé par la valeur de Netlify.

---

## 💾 Stockage Persistant (Sessions WhatsApp)

### Problème

Sur Render (plan gratuit), le système de fichiers est **éphémère**. Les sessions WhatsApp stockées dans `sessions/` seront perdues à chaque redémarrage.

### Solutions

#### Solution 1 : Render Persistent Disk (Recommandé)

1. **Upgrade vers le plan Starter** ($7/mois)
2. Dans les settings de votre service Render :
   - **Persistent Disk** → **Add Disk**
   - **Mount Path** : `/opt/render/project/src/backend/persistent-disk`
   - **Size** : 1 GB (minimum)
3. **Modifier `WHATSAPP_SESSION_PATH`** :
   ```bash
   WHATSAPP_SESSION_PATH=/opt/render/project/src/backend/persistent-disk/sessions
   ```

#### Solution 2 : Supabase Storage (Recommandé en complément)

> ✅ **Nouveau** : le backend AMDA synchronise automatiquement les fichiers de session entre Render et Supabase.

1. Créez un bucket Supabase (par exemple `amda-whatsapp-sessions`)
2. Dans **Supabase > Storage > Policies**, autorisez le service role à lire/écrire
3. Ajoutez la variable d'environnement suivante sur Render :
   ```bash
   SUPABASE_STORAGE_BUCKET=amda-whatsapp-sessions
   ```
4. Conservez `WHATSAPP_SESSION_PATH` pointant vers le disque Render (persistant si possible)
5. Le backend synchronisera automatiquement :
   - À chaque `creds.update` (login, rafraîchissement)
   - Au redémarrage du serveur (restauration depuis Supabase si disque vide)
   - Lors de la déconnexion ou du logout (suppression propre côté Supabase et Render)

**Avantages combinés (Disque Render + Supabase Storage)** :
- Le disque Render offre des accès rapides et évite la latence réseau
- Supabase Storage fournit un backup externe et permet la restauration après redéploiement
- Les deux sources sont désormais maintenues automatiquement par le code

#### Solution 3 : AWS S3 (Alternative avancée)

1. Créez un bucket S3 dédié (ex. `amda-whatsapp-sessions`)
2. Remplacez Supabase Storage par S3 si vous avez besoin d'un stockage multi-région
3. Nécessite une adaptation du code (non fournie ici) mais la logique est similaire

---

## 👥 Utilisateurs Multiples et Scalabilité

### ✅ OUI, Plusieurs Utilisateurs Peuvent Utiliser le Bot Simultanément

**AMDA est conçu pour gérer plusieurs utilisateurs en même temps !**

#### Architecture Multi-Utilisateurs

```
┌─────────────────────────────────────┐
│         Backend Render              │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ User 1   │  │ User 2   │       │
│  │ Socket 1 │  │ Socket 2  │       │
│  └────┬─────┘  └────┬─────┘       │
│       │             │              │
│       └─────┬───────┘              │
│             │                       │
│      ┌──────▼──────┐                │
│      │  Supabase   │                │
│      │  Database   │                │
│      └─────────────┘                │
└─────────────────────────────────────┘
```

#### Comment ça fonctionne

1. **Isolation par User ID** :
   - Chaque utilisateur a son propre `userId` unique
   - Les sessions WhatsApp sont stockées séparément : `sessions/{userId}/`
   - Chaque socket est associé à un `userId` spécifique

2. **Base de données partagée** :
   - Supabase stocke les données de tous les utilisateurs
   - Chaque table a une colonne `user_id` pour isoler les données
   - Les requêtes sont filtrées par `user_id`

3. **Sockets multiples** :
   - Le backend maintient un `Map<userId, socket>` pour chaque utilisateur
   - Chaque utilisateur peut avoir son propre socket WhatsApp actif
   - Les messages sont routés vers le bon socket selon le `userId`

#### Limitations et Recommandations

##### Plan Render Free
- ⚠️ **1 instance** seulement
- ⚠️ **512 MB RAM** - peut gérer ~10-20 utilisateurs simultanés
- ⚠️ **Système de fichiers éphémère** - sessions perdues au redémarrage
- ⚠️ **Sleep après 15 min d'inactivité** - le serveur se réveille au premier appel

##### Plan Render Starter ($7/mois)
- ✅ **1 instance** (peut être augmenté)
- ✅ **512 MB RAM** - peut gérer ~20-50 utilisateurs simultanés
- ✅ **Disque persistant** disponible
- ✅ **Pas de sleep** - serveur toujours actif

##### Plan Render Standard ($25/mois)
- ✅ **Scaling horizontal** possible
- ✅ **2 GB RAM** - peut gérer ~100+ utilisateurs simultanés
- ✅ **Disque persistant** inclus
- ✅ **Haute disponibilité**

#### Recommandations pour la Production

1. **Pour < 50 utilisateurs** :
   - Plan Render Starter ($7/mois)
   - Disque persistant pour les sessions
   - Redis optionnel (améliore les performances)

2. **Pour 50-200 utilisateurs** :
   - Plan Render Standard ($25/mois)
   - Redis recommandé
   - Monitoring activé

3. **Pour > 200 utilisateurs** :
   - Plan Render Pro ($85/mois) ou dédié
   - Scaling horizontal
   - Load balancer
   - Redis obligatoire
   - Base de données optimisée

#### Gestion des Conflits WhatsApp

**Important** : WhatsApp ne permet qu'**une seule connexion active par numéro de téléphone**.

Si un utilisateur :
- Se connecte depuis son téléphone ET le bot en même temps → **Conflit**
- Le bot détecte automatiquement les conflits
- Le bot se déconnecte automatiquement en cas de conflit
- L'utilisateur doit se reconnecter après

**C'est normal et géré automatiquement par le code !**

---

## ✅ Vérification et Tests

### 1. Vérifier le Backend

```bash
# Health check
curl https://votre-api.onrender.com/health

# Devrait retourner :
# {"status":"ok","timestamp":"...","environment":"production"}
```

### 2. Vérifier le Frontend

1. Ouvrez https://votre-app.netlify.app
2. Vérifiez que le splash screen s'affiche
3. Testez la connexion
4. Vérifiez que les appels API fonctionnent (ouvrez la console du navigateur)

### 3. Vérifier CORS

Dans la console du navigateur, vous ne devriez **PAS** voir d'erreurs CORS.

Si vous voyez :
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

➡️ Vérifiez que `FRONTEND_URL` dans Render correspond exactement à l'URL Netlify.

### 4. Tester la Reconnexion Automatique

1. Connectez votre WhatsApp via le bot
2. Redémarrez le serveur Render (dans les settings)
3. Attendez 1-2 minutes
4. Vérifiez les logs Render
5. Le bot devrait se reconnecter automatiquement

---

## 🐳 Docker & Conteneurisation (Optionnel)

### Objectifs

- Construire des images reproductibles pour le backend et le frontend
- Faciliter les déploiements sur Render (backend) ou toute autre plateforme compatible Docker
- Tester localement l'écosystème complet (frontend + backend + base de données)

### 1. Dockerfile Backend (multi-stage)

Créez `backend/Dockerfile` :

```dockerfile
# Étape 1 : build TypeScript
FROM node:18-slim AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps
COPY backend/ .
RUN npm run build

# Étape 2 : image de production
FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY backend/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
CMD ["node", "dist/server.js"]
```

### 2. Dockerfile Frontend

Netlify gère déjà le build, mais pour un hébergement Docker classique :

1. Créez `frontend/Dockerfile` (multi-stage Vite + Nginx)
2. `npm run build` dans la première étape
3. Servez le contenu de `dist/` via `nginx:alpine`

### 3. docker-compose (local)

Pour tester l'environnement complet :

```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    env_file: ./backend/.env
    volumes:
      - ./backend/sessions:/app/sessions
    ports:
      - "3000:3000"

  frontend:
    build: ./frontend
    environment:
      - VITE_API_URL=http://localhost:3000
    ports:
      - "5173:5173"

  supabase:
    image: supabase/postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: postgres
```

> 📝 Astuce : conservez les valeurs `WHATSAPP_SESSION_PATH`, `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET` identiques à la production pour valider la synchronisation des sessions en local.

---

## 🔍 Maintenance et Monitoring

### Logs Render

- **Dashboard Render** → Votre service → **Logs**
- Surveillez les erreurs et les reconnexions

### Logs Netlify

- **Dashboard Netlify** → Votre site → **Functions** → **Logs**
- Surveillez les erreurs de build

### Monitoring Recommandé

1. **Uptime Monitoring** :
   - Utilisez **UptimeRobot** (gratuit) : https://uptimerobot.com
   - Surveillez `/health` toutes les 5 minutes

2. **Error Tracking** :
   - **Sentry** (gratuit jusqu'à 5k events/mois) : https://sentry.io
   - Intégrez Sentry dans le backend et frontend

3. **Analytics** :
   - **Google Analytics** pour le frontend
   - Logs personnalisés pour le backend

---

## 🚨 Problèmes Courants et Solutions

### Problème 1 : CORS Errors

**Symptôme** : Erreurs CORS dans la console du navigateur

**Solution** :
1. Vérifiez que `FRONTEND_URL` dans Render = URL Netlify exacte
2. Vérifiez qu'il n'y a pas de `/` à la fin
3. Redéployez le backend après modification

### Problème 2 : Sessions WhatsApp Perdues

**Symptôme** : Les utilisateurs doivent se reconnecter après chaque redémarrage

**Solution** :
1. Passez au plan Starter avec disque persistant
2. OU implémentez le stockage cloud (Supabase Storage/S3)

### Problème 3 : Timeout sur Render Free

**Symptôme** : Le serveur "s'endort" après 15 min

**Solution** :
1. Passez au plan Starter (pas de sleep)
2. OU activez le keep-alive intégré :
   ```bash
   RENDER_KEEP_ALIVE_URL=https://votre-api.onrender.com/health
   RENDER_KEEP_ALIVE_INTERVAL_MS=600000 # toutes les 10 minutes
   ```
   Le backend pingera automatiquement Render pour éviter la mise en veille.

### Problème 4 : Build Failed sur Netlify

**Symptôme** : Erreur de build sur Netlify

**Solution** :
1. Vérifiez les logs de build
2. Assurez-vous que `npm run build` fonctionne en local
3. Vérifiez les variables d'environnement

---

## 📊 Coûts Estimés

### Plan Gratuit (Développement)

- **Netlify** : Gratuit (100 GB bandwidth/mois)
- **Render** : Gratuit (limité, avec sleep)
- **Supabase** : Gratuit (500 MB database, 1 GB storage)
- **Total** : **$0/mois**

### Plan Starter (Petite Production)

- **Netlify** : Gratuit
- **Render** : $7/mois (Starter)
- **Supabase** : Gratuit
- **Total** : **~$7/mois**

### Plan Standard (Production Moyenne)

- **Netlify** : Gratuit
- **Render** : $25/mois (Standard)
- **Supabase** : Gratuit (ou Pro $25/mois si besoin)
- **Total** : **~$25-50/mois**

---

## 🎯 Checklist de Déploiement

### Backend (Render)

- [ ] Repository connecté à Render
- [ ] Build command configuré : `cd backend && npm install && npm run build`
- [ ] Start command configuré : `cd backend && npm start`
- [ ] Toutes les variables d'environnement ajoutées
- [ ] Health check path : `/health`
- [ ] Plan choisi (Starter recommandé)
- [ ] Disque persistant ajouté (si Starter)
- [ ] Service déployé et accessible
- [ ] Test `/health` réussi

### Frontend (Netlify)

- [ ] Repository connecté à Netlify
- [ ] Build command : `npm run build`
- [ ] Publish directory : `dist`
- [ ] Variable `VITE_API_URL` configurée
- [ ] Redirections configurées (`netlify.toml`)
- [ ] Site déployé et accessible
- [ ] Test de connexion réussi

### Vérifications Finales

- [ ] CORS fonctionne (pas d'erreurs dans la console)
- [ ] Authentification fonctionne
- [ ] Connexion WhatsApp fonctionne
- [ ] QR Code s'affiche
- [ ] Reconnexion automatique fonctionne (test après redémarrage)
- [ ] Les médias s'affichent correctement
- [ ] Les routes API répondent correctement

---

## 🔄 Reconnexion Automatique

### Comment ça fonctionne

Le backend se reconnecte automatiquement aux sessions WhatsApp au démarrage :

1. **Au démarrage du serveur** (`server.ts`) :
   - Récupère toutes les sessions depuis Supabase
   - Vérifie si les credentials existent sur le disque
   - Reconnecte chaque utilisateur en arrière-plan
   - Ajoute un délai de 2 secondes entre chaque reconnexion

2. **Lors d'une requête de statut** (`getWhatsAppStatus`) :
   - Si pas de socket mais credentials existent → tente la reconnexion
   - Si activité récente détectée → considère comme connecté

3. **En cas de déconnexion** :
   - Le bot détecte automatiquement la déconnexion
   - Tente de se reconnecter automatiquement
   - Limite les tentatives pour éviter le spam

### Amélioration pour Production

Pour améliorer la reconnexion, vous pouvez :

1. **Augmenter le délai entre reconnexions** (déjà fait : 2 secondes)
2. **Ajouter un retry avec backoff exponentiel** (déjà implémenté)
3. **Utiliser un job scheduler** pour vérifier périodiquement les connexions

---

## 📝 Notes Importantes

### ⚠️ Limitations Render Free

- **Sleep après 15 min** : Le serveur s'endort et se réveille au premier appel (latence de ~30 secondes)
- **Système de fichiers éphémère** : Les sessions sont perdues au redémarrage
- **512 MB RAM** : Limite le nombre d'utilisateurs simultanés

### ✅ Recommandations

1. **Utilisez le plan Starter minimum** pour la production
2. **Activez le disque persistant** pour les sessions
3. **Configurez Redis** pour améliorer les performances
4. **Surveillez les logs** régulièrement
5. **Testez la reconnexion** après chaque déploiement

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Render et Netlify
2. Vérifiez les variables d'environnement
3. Testez les endpoints API avec curl/Postman
4. Vérifiez la documentation Render/Netlify

---

## 🎉 Félicitations !

Votre application AMDA est maintenant en production ! 🚀

Les utilisateurs peuvent :
- ✅ S'inscrire et se connecter
- ✅ Connecter leur WhatsApp
- ✅ Utiliser toutes les fonctionnalités
- ✅ Se reconnecter automatiquement après redémarrage (si disque persistant)

**Plusieurs utilisateurs peuvent utiliser le bot simultanément sans problème !** 🎯

