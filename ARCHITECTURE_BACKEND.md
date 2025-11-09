# 🏗️ ARCHITECTURE BACKEND - AMDA

## 📌 LANGAGE ET STACK TECHNIQUE

### Langage Principal
**Node.js** avec **TypeScript** (recommandé) ou **JavaScript**

**Pourquoi Node.js ?**
- ✅ Écosystème riche pour WhatsApp (baileys, whatsapp-web.js)
- ✅ Performance excellente pour I/O asynchrone (parfait pour WhatsApp)
- ✅ Partage de code avec le frontend React (TypeScript)
- ✅ Large communauté et packages npm
- ✅ Facile à déployer (Railway, Render, VPS)

**TypeScript vs JavaScript ?**
- ✅ **TypeScript recommandé** : Type safety, meilleure DX, moins d'erreurs
- ✅ Cohérence avec le frontend React (déjà en TypeScript)
- ✅ Meilleure maintenabilité pour un projet de cette taille

---

## 🎯 STACK TECHNIQUE COMPLÈTE

### Core Backend
```
Node.js 18+ (LTS)
TypeScript 5+
Express.js 4.x
```

### Base de Données
```
PostgreSQL (via Supabase)
- Tables relationnelles
- Row Level Security (RLS)
- Real-time subscriptions (optionnel)
```

### Cache & Queues
```
Redis 7+
- Cache des sessions WhatsApp
- Queue pour tâches asynchrones
- Rate limiting
```

### Authentification
```
JWT (JSON Web Tokens)
Supabase Auth (optionnel, ou implémentation custom)
```

### WhatsApp Integration
```
@whiskeysockets/baileys
- Bibliothèque officielle pour WhatsApp Web
- Gestion QR code
- Événements en temps réel
- Multi-device support
```

### Paiements
```
Stripe API
- Abonnements récurrents
- Webhooks pour événements
- Portail client
```

### Stockage Médias
```
Cloudinary ou AWS S3
- Upload images/vidéos View Once
- Backup messages supprimés
- CDN pour performance
```

---

## 📁 STRUCTURE DU PROJET BACKEND

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # Configuration Supabase
│   │   ├── redis.ts              # Configuration Redis
│   │   ├── stripe.ts             # Configuration Stripe
│   │   └── env.ts                # Variables d'environnement
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts    # Login, Register, Logout
│   │   ├── user.controller.ts    # Gestion utilisateurs
│   │   ├── whatsapp.controller.ts # Connexion WhatsApp, QR
│   │   ├── status.controller.ts  # Gestion status
│   │   ├── viewOnce.controller.ts # View Once captures
│   │   ├── deletedMessages.controller.ts # Messages supprimés
│   │   ├── autoresponder.controller.ts # Répondeur auto
│   │   ├── scheduledStatus.controller.ts # Status programmés
│   │   ├── subscription.controller.ts # Abonnements Stripe
│   │   └── analytics.controller.ts # Analytics (Premium)
│   │
│   ├── services/
│   │   ├── whatsapp.service.ts   # Logique WhatsApp (baileys)
│   │   ├── auth.service.ts       # JWT, validation
│   │   ├── stripe.service.ts     # Paiements Stripe
│   │   ├── storage.service.ts    # Upload Cloudinary/S3
│   │   ├── quota.service.ts      # Gestion quotas (Gratuit)
│   │   └── notification.service.ts # Notifications push/email
│   │
│   ├── models/
│   │   ├── User.model.ts         # Modèle User
│   │   ├── Subscription.model.ts # Modèle Subscription
│   │   ├── WhatsAppSession.model.ts # Session WhatsApp
│   │   └── ...                    # Autres modèles
│   │
│   ├── routes/
│   │   ├── auth.routes.ts        # Routes authentification
│   │   ├── user.routes.ts        # Routes utilisateurs
│   │   ├── whatsapp.routes.ts    # Routes WhatsApp
│   │   ├── status.routes.ts      # Routes status
│   │   ├── viewOnce.routes.ts    # Routes View Once
│   │   ├── deletedMessages.routes.ts # Routes messages supprimés
│   │   ├── autoresponder.routes.ts # Routes répondeur
│   │   ├── scheduledStatus.routes.ts # Routes status programmés
│   │   ├── subscription.routes.ts # Routes abonnements
│   │   └── analytics.routes.ts  # Routes analytics
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts    # Vérification JWT
│   │   ├── rateLimit.middleware.ts # Rate limiting
│   │   ├── error.middleware.ts   # Gestion erreurs
│   │   ├── validation.middleware.ts # Validation inputs
│   │   └── premium.middleware.ts # Vérification plan Premium
│   │
│   ├── utils/
│   │   ├── logger.ts             # Logging (Winston/Pino)
│   │   ├── errors.ts             # Classes d'erreurs custom
│   │   ├── validators.ts         # Validateurs (Zod)
│   │   └── helpers.ts            # Fonctions utilitaires
│   │
│   ├── jobs/
│   │   ├── scheduledStatus.job.ts # Job pour publier status
│   │   ├── quotaReset.job.ts     # Reset quotas mensuels
│   │   └── cleanup.job.ts        # Nettoyage données anciennes
│   │
│   ├── queues/
│   │   ├── whatsapp.queue.ts     # Queue pour actions WhatsApp
│   │   ├── media.queue.ts        # Queue pour upload médias
│   │   └── notification.queue.ts # Queue pour notifications
│   │
│   ├── types/
│   │   ├── whatsapp.types.ts     # Types WhatsApp
│   │   ├── user.types.ts         # Types User
│   │   └── ...                    # Autres types TypeScript
│   │
│   ├── app.ts                    # Configuration Express
│   └── server.ts                 # Point d'entrée
│
├── tests/
│   ├── unit/                     # Tests unitaires
│   └── integration/              # Tests d'intégration
│
├── .env.example                  # Exemple variables d'environnement
├── .gitignore
├── package.json
├── tsconfig.json                 # Configuration TypeScript
└── README.md
```

---

## 🔄 FLUX DE DONNÉES

### 1. Authentification
```
Client → POST /api/auth/login
  ↓
auth.controller.ts
  ↓
auth.service.ts (validation + JWT)
  ↓
Supabase (vérification user)
  ↓
Retour JWT token
```

### 2. Connexion WhatsApp
```
Client → GET /api/whatsapp/qr
  ↓
whatsapp.controller.ts
  ↓
whatsapp.service.ts (baileys)
  ↓
Génération QR code
  ↓
Stockage session dans Redis
  ↓
Retour QR code (base64)
```

### 3. Auto-Like Status
```
WhatsApp Event → whatsapp.service.ts
  ↓
Détection nouveau status
  ↓
Vérification plan (Gratuit = tous, Premium = filtrage)
  ↓
Like automatique via baileys
  ↓
Enregistrement dans PostgreSQL
  ↓
Notification client (WebSocket/SSE)
```

### 4. Capture View Once
```
WhatsApp Event → whatsapp.service.ts
  ↓
Détection message "view once"
  ↓
Vérification quota (3/mois si Gratuit)
  ↓
Téléchargement média
  ↓
Upload Cloudinary/S3
  ↓
Enregistrement dans PostgreSQL
  ↓
Notification client
```

### 5. Répondeur Automatique
```
WhatsApp Event → whatsapp.service.ts
  ↓
Détection nouveau message
  ↓
Vérification mode actif (Hors Ligne/Occupé)
  ↓
Vérification filtrage (Premium)
  ↓
Envoi réponse automatique
  ↓
Enregistrement statistiques
  ↓
Notification si contact désactivé (Premium)
```

---

## 🔐 SÉCURITÉ

### Authentification
- **JWT** : Tokens avec expiration (15 min access, 7 jours refresh)
- **Supabase Auth** : Alternative avec gestion sessions
- **Middleware** : Vérification token sur routes protégées

### Rate Limiting
- **Redis** : Limitation requêtes par IP/user
- **Endpoints sensibles** : WhatsApp, uploads, paiements

### Validation
- **Zod** : Validation schémas TypeScript
- **Sanitization** : Nettoyage inputs utilisateurs

### Chiffrement
- **HTTPS** : Obligatoire en production
- **Variables sensibles** : Stockées dans .env
- **Sessions WhatsApp** : Chiffrées dans Redis

---

## 📊 PERFORMANCES

### Cache Redis
- **Sessions WhatsApp** : Cache pour éviter reconnexions
- **Données fréquentes** : User info, quotas, config
- **TTL** : Expiration automatique

### Queues
- **Tâches lourdes** : Upload médias, envoi notifications
- **WhatsApp actions** : Like status, envoi messages
- **Background jobs** : Status programmés, reset quotas

### Optimisations
- **Connection pooling** : PostgreSQL
- **Compression** : Gzip pour réponses API
- **CDN** : Cloudflare pour assets statiques

---

## 🚀 DÉPLOIEMENT

### Options Recommandées

#### 1. Railway (Recommandé)
- ✅ Déploiement automatique depuis GitHub
- ✅ PostgreSQL + Redis inclus
- ✅ Variables d'environnement faciles
- ✅ Scaling automatique
- ✅ Prix : ~$5-20/mois

#### 2. Render
- ✅ Similar à Railway
- ✅ PostgreSQL inclus
- ✅ Redis disponible
- ✅ Free tier disponible
- ✅ Prix : ~$7-25/mois

#### 3. VPS (DigitalOcean, Hetzner)
- ✅ Contrôle total
- ✅ Prix fixe (~$5-10/mois)
- ⚠️ Configuration manuelle requise
- ⚠️ Maintenance serveur

### Variables d'Environnement
```env
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.amda.com

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=xxx

# JWT
JWT_SECRET=xxx
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Storage
CLOUDINARY_URL=cloudinary://...
# ou
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=amda-media

# Frontend
FRONTEND_URL=https://amda.com
```

---

## 📦 PACKAGES NPM PRINCIPAUX

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@whiskeysockets/baileys": "^6.6.0",
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "stripe": "^13.0.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.0",
    "bull": "^4.11.0",
    "cloudinary": "^1.41.0",
    "winston": "^3.11.0",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.3.2",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
```

---

## 🎯 PROCHAINES ÉTAPES

1. **Initialiser le projet backend**
   - Créer structure de dossiers
   - Setup TypeScript
   - Configuration Express de base

2. **Configurer Supabase**
   - Créer schéma de base de données
   - Setup client Supabase

3. **Implémenter authentification**
   - Routes login/register
   - JWT middleware

4. **Intégrer WhatsApp**
   - Setup baileys
   - Gestion QR code
   - Événements de base

---

**Version** : 1.0.0  
**Date** : 2025-01-15

