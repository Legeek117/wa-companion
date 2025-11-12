# 📝 Guide de Création du Fichier .env

## 🎯 Étapes Rapides

### 1. Créer le fichier `.env` dans le dossier `backend/`

### 2. Copier le contenu ci-dessous et remplir vos valeurs

### 3. Obtenir vos credentials Supabase

Allez sur [supabase.com](https://supabase.com) → Votre projet → Settings → API :
- **SUPABASE_URL** : Project URL
- **SUPABASE_ANON_KEY** : anon/public key
- **SUPABASE_SERVICE_ROLE_KEY** : service_role key (⚠️ SECRET - ne jamais exposer au frontend)

### 4. Générer les clés JWT

J'ai généré deux clés sécurisées pour vous :
- **JWT_SECRET** : `9e634c167fb3912844010de7a4cebd8506d7bf0cc7a7804c700dcbf2360ac18f`
- **JWT_REFRESH_SECRET** : `a7f68bbcfd779851f64c57c16d86e8619466fbddf87c70e824f77575cb330479`

Ou générez-en de nouvelles avec :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📋 Template .env

Copiez ce contenu dans votre fichier `backend/.env` :

```env
# ============================================
# AMDA Backend - Configuration
# ============================================

# Server Configuration
NODE_ENV=development
PORT=8000
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8080

# Database - Supabase (REQUIRED)
# Récupérez ces valeurs dans Supabase Dashboard > Settings > API
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-anon-key-ici
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key-ici
DATABASE_URL=postgresql://postgres:password@db.votre-projet.supabase.co:5432/postgres

# Redis (Optionnel pour les tests de base)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Authentication (REQUIRED)
# Clés générées automatiquement (32 bytes = 64 caractères hex)
JWT_SECRET=9e634c167fb3912844010de7a4cebd8506d7bf0cc7a7804c700dcbf2360ac18f
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=a7f68bbcfd779851f64c57c16d86e8619466fbddf87c70e824f77575cb330479
JWT_REFRESH_EXPIRES_IN=30d

# WhatsApp (REQUIRED)
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000

# Stripe (Placeholder - pas nécessaire pour les tests auth/WhatsApp)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_MONTHLY=price_placeholder_monthly
STRIPE_PRICE_ID_YEARLY=price_placeholder_yearly

# Storage - Cloudinary (Optionnel)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Storage - AWS S3 (Optionnel)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=amda-media
AWS_REGION=us-east-1

# Email (Optionnel)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

# Logging
LOG_LEVEL=debug
```

## ✅ Checklist

- [ ] Fichier `.env` créé dans `backend/`
- [ ] `SUPABASE_URL` rempli
- [ ] `SUPABASE_ANON_KEY` rempli
- [ ] `SUPABASE_SERVICE_ROLE_KEY` rempli
- [ ] `JWT_SECRET` rempli (clé générée)
- [ ] `JWT_REFRESH_SECRET` rempli (clé générée)
- [ ] `FRONTEND_URL` = `http://localhost:8080` (votre port frontend)

## 🚨 Important

1. **Ne jamais commiter le fichier `.env`** dans Git (déjà dans `.gitignore`)
2. **SUPABASE_SERVICE_ROLE_KEY** est très sensible - ne jamais l'exposer au frontend
3. Les clés JWT doivent être **uniques** et **sécurisées** en production

## 🧪 Tester après création

```bash
cd backend
npm run dev
```

Le serveur devrait démarrer sans erreur si toutes les variables sont correctes.








