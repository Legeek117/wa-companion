# 🧪 Guide de Test - Inscription, Connexion et WhatsApp

## ✅ Ce qui a été implémenté

1. **Authentification complète**
   - Inscription (Register)
   - Connexion (Login)
   - Get Me (obtenir les infos utilisateur)
   - Logout
   - JWT avec bcrypt

2. **Intégration WhatsApp**
   - Génération QR code
   - Gestion des sessions
   - Statut de connexion
   - Déconnexion

## 📋 Étapes pour Tester

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Configurer les variables d'environnement

Créez un fichier `.env` dans `backend/` avec au minimum :

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

# JWT (REQUIRED - générez des clés sécurisées de 32+ caractères)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long
JWT_REFRESH_EXPIRES_IN=30d

# WhatsApp (REQUIRED)
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000

# Redis (Optional - le serveur continuera sans Redis)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe (Placeholder - pas nécessaire pour les tests de base)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_MONTHLY=price_placeholder_monthly
STRIPE_PRICE_ID_YEARLY=price_placeholder_yearly

# Logging
LOG_LEVEL=debug
```

### 3. Appliquer le schéma Supabase

Dans votre dashboard Supabase, exécutez le contenu de `backend/supabase/schema.sql`

### 4. Démarrer le serveur

```bash
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:8000`

### 5. Tester avec curl ou Postman

#### Test 1 : Health Check
```bash
curl http://localhost:8000/health
```

#### Test 2 : Inscription
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

**Copiez le token JWT de la réponse !**

#### Test 3 : Connexion
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

#### Test 4 : Get Me (remplacez YOUR_TOKEN)
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test 5 : Get QR Code WhatsApp
```bash
curl -X GET http://localhost:8000/api/whatsapp/qr \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test 6 : Get Status WhatsApp
```bash
curl -X GET http://localhost:8000/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Fichiers de Test

- `test-api.http` : Fichier pour l'extension REST Client (VS Code)
- `TESTING.md` : Guide détaillé des tests
- `QUICK_START.md` : Guide de démarrage rapide

## 🐛 Problèmes Courants

### Erreur : "Missing required environment variable"
- Vérifiez que `.env` existe dans `backend/`
- Vérifiez que toutes les variables Supabase sont présentes

### Erreur : "Cannot find module"
- Exécutez `npm install` dans `backend/`

### Erreur : "Failed to connect to Supabase"
- Vérifiez vos credentials Supabase
- Vérifiez que le schéma SQL a été appliqué

### Erreur : "Redis Client Error"
- Le serveur continuera sans Redis pour les tests de base
- Pour activer Redis : `redis-server` (ou Docker)

## ✅ Routes Disponibles

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Get current user (protégé)
- `POST /api/auth/logout` - Déconnexion (protégé)

### WhatsApp
- `GET /api/whatsapp/qr` - Obtenir QR code (protégé)
- `GET /api/whatsapp/status` - Statut de connexion (protégé)
- `POST /api/whatsapp/disconnect` - Déconnexion WhatsApp (protégé)








