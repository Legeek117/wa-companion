# 🚀 Guide Rapide - Créer votre fichier .env

## Étape 1 : Créer le fichier .env

Dans le dossier `backend`, créez un fichier `.env` :

```bash
cd backend
copy env.template .env
# ou sur Linux/Mac
cp env.template .env
```

## Étape 2 : Configurer Supabase

### Obtenir vos clés Supabase :

1. **Allez sur [supabase.com](https://supabase.com)**
2. **Créez un compte** (gratuit) ou **connectez-vous**
3. **Créez un nouveau projet** ou **sélectionnez un projet existant**
4. **Allez dans Settings → API**
5. **Copiez les valeurs suivantes :**

```env
# Dans votre .env, remplacez :
SUPABASE_URL=https://xxxxx.supabase.co          # Project URL
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # anon public
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role (SECRET!)
```

⚠️ **IMPORTANT** : `SUPABASE_SERVICE_ROLE_KEY` est **SECRET** - ne jamais l'exposer au frontend !

## Étape 3 : Créer les tables dans Supabase

1. **Allez dans SQL Editor** dans votre projet Supabase
2. **Exécutez le script** `backend/supabase/schema.sql`
3. **Vérifiez** que les tables sont créées (Table Editor)

## Étape 4 : Générer les secrets JWT

### Méthode rapide (recommandée) :
```bash
cd backend
npm run generate-secrets
```

Ce script génère automatiquement des secrets JWT sécurisés et vous montre exactement quoi copier dans votre `.env`.

### Méthode manuelle :

#### Sur Windows (PowerShell) :
```powershell
# Générer JWT_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Générer JWT_REFRESH_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

#### Sur Linux/Mac :
```bash
# Générer JWT_SECRET
openssl rand -base64 32

# Générer JWT_REFRESH_SECRET
openssl rand -base64 32
```

#### Ou utilisez un générateur en ligne :
- [randomkeygen.com](https://randomkeygen.com/)
- Copiez une clé de 256 bits

## Étape 5 : Remplir votre .env

Votre fichier `.env` devrait ressembler à :

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8081

# Database - Supabase (OBLIGATOIRE)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:password@localhost:5432/amda

# JWT Authentication (OBLIGATOIRE)
JWT_SECRET=votre-secret-jwt-super-securise-32-caracteres-minimum
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=votre-secret-refresh-super-securise-32-caracteres-minimum
JWT_REFRESH_EXPIRES_IN=7d

# Redis (Optionnel)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000

# Stripe (Optionnel pour les tests)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_MONTHLY=price_placeholder_monthly
STRIPE_PRICE_ID_YEARLY=price_placeholder_yearly

# Logging
LOG_LEVEL=info
```

## Étape 6 : Vérifier la configuration

```bash
cd backend
npm run check-env
```

Vous devriez voir :
```
✅ SUPABASE_URL (REQUIRED): OK
✅ SUPABASE_ANON_KEY (REQUIRED): OK
✅ SUPABASE_SERVICE_ROLE_KEY (REQUIRED): OK
✅ JWT_SECRET (REQUIRED): OK
✅ JWT_REFRESH_SECRET (REQUIRED): OK
✅ All environment variables are properly configured
```

## Étape 7 : Démarrer le serveur

```bash
npm run dev
```

Le serveur devrait démarrer et afficher :
```
✅ All environment variables are properly configured
🚀 Server running on port 3000
```

## ❌ Si vous voyez des erreurs :

### "Missing required environment variable: SUPABASE_URL"
→ Votre fichier `.env` n'existe pas ou la variable n'est pas définie

### "Variables with placeholder values"
→ Remplacez les valeurs placeholder par de vraies valeurs

### "Failed to create user"
→ Vérifiez :
1. Les clés Supabase sont correctes
2. La table `users` existe dans Supabase (exécutez `schema.sql`)
3. Les permissions Supabase permettent l'insertion

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Guide de vérification](./VERIFIER_ENV.md)
- [Template .env](./env.template)

















