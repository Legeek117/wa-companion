# 🚀 Démarrage Rapide - AMDA Backend

## 📋 Prérequis Minimum pour Tester

### 1. Supabase
- Créer un projet sur [supabase.com](https://supabase.com)
- Appliquer le schéma SQL : `backend/supabase/schema.sql`
- Récupérer les credentials :
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Variables d'Environnement Minimales

Créez un fichier `.env` dans `backend/` avec :

```env
# Server
NODE_ENV=development
PORT=8000
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Supabase (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Redis (Optional - le serveur continuera sans Redis)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (REQUIRED - générez des clés sécurisées)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long
JWT_REFRESH_EXPIRES_IN=30d

# WhatsApp (REQUIRED)
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000

# Stripe (Placeholder pour les tests - pas nécessaire pour auth/WhatsApp)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_MONTHLY=price_placeholder_monthly
STRIPE_PRICE_ID_YEARLY=price_placeholder_yearly

# Logging
LOG_LEVEL=debug
```

## 🔧 Installation

```bash
cd backend
npm install
```

## ▶️ Démarrer le Serveur

```bash
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:8000`

## ✅ Tests Rapides

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Inscription
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

### 3. Connexion
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

**Copiez le token JWT de la réponse !**

### 4. Get Me (avec token)
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Get QR Code WhatsApp
```bash
curl -X GET http://localhost:8000/api/whatsapp/qr \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 6. Get Status WhatsApp
```bash
curl -X GET http://localhost:8000/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🐛 Problèmes Courants

### Erreur : "Missing required environment variable"
- Vérifiez que `.env` existe dans `backend/`
- Vérifiez que toutes les variables Supabase sont présentes

### Erreur : "Failed to connect to Supabase"
- Vérifiez vos credentials Supabase
- Vérifiez que le schéma SQL a été appliqué dans Supabase Dashboard

### Erreur : "Redis Client Error"
- Le serveur continuera sans Redis pour les tests de base
- Pour activer Redis : `redis-server` (ou Docker)

### Erreur : "Invalid token"
- Vérifiez que vous utilisez le token de la réponse `/login`
- Le token doit être dans le header : `Authorization: Bearer {token}`

## 📝 Notes

- Les sessions WhatsApp sont stockées dans `./sessions/{userId}/`
- Le QR code expire après ~20 secondes
- Pour un nouveau QR code, refaites une requête `/qr`






