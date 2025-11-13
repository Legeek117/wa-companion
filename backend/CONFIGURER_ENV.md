# ⚙️ Configuration du Fichier .env

## 📋 Variables à Configurer

Votre fichier `.env` existe déjà. Voici ce que vous devez configurer :

### ✅ 1. Configuration Serveur (Déjà OK)

```env
NODE_ENV=development
PORT=8000
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8080  # ✅ Port 8080 configuré
```

### ✅ 2. Clés JWT (Déjà Générées)

```env
JWT_SECRET=9e634c167fb3912844010de7a4cebd8506d7bf0cc7a7804c700dcbf2360ac18f
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=a7f68bbcfd779851f64c57c16d86e8619466fbddf87c70e824f77575cb330479
JWT_REFRESH_EXPIRES_IN=30d
```

### 🔴 3. Supabase (À REMPLIR)

**Où trouver ces valeurs :**
1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. **Settings** → **API**
4. Copiez les valeurs :

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY...
DATABASE_URL=postgresql://postgres:[VOTRE-MOT-DE-PASSE]@db.xxxxx.supabase.co:5432/postgres
```

⚠️ **ATTENTION** : 
- `SUPABASE_SERVICE_ROLE_KEY` est très sensible - ne jamais l'exposer au frontend
- Pour `DATABASE_URL`, remplacez `[VOTRE-MOT-DE-PASSE]` par le mot de passe de votre base de données Supabase

### ✅ 4. WhatsApp (Déjà OK)

```env
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000
```

### ✅ 5. Redis (Optionnel - OK pour les tests)

```env
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

Le serveur fonctionnera sans Redis pour les tests de base.

### ✅ 6. Stripe (Placeholder - OK pour les tests)

```env
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_MONTHLY=price_placeholder_monthly
STRIPE_PRICE_ID_YEARLY=price_placeholder_yearly
```

Ces valeurs sont des placeholders. Vous pourrez les remplacer plus tard quand vous configurerez Stripe.

## 📝 Template Complet

Voici un template complet à copier dans votre `.env` :

```env
# Server Configuration
NODE_ENV=development
PORT=8000
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8080

# Database - Supabase (À REMPLIR)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-anon-key-ici
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key-ici
DATABASE_URL=postgresql://postgres:password@db.votre-projet.supabase.co:5432/postgres

# Redis (Optionnel)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Authentication (Déjà généré)
JWT_SECRET=9e634c167fb3912844010de7a4cebd8506d7bf0cc7a7804c700dcbf2360ac18f
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=a7f68bbcfd779851f64c57c16d86e8619466fbddf87c70e824f77575cb330479
JWT_REFRESH_EXPIRES_IN=30d

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000

# Stripe (Placeholder)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_MONTHLY=price_placeholder_monthly
STRIPE_PRICE_ID_YEARLY=price_placeholder_yearly

# Storage (Optionnel)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Optionnel)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

# Logging
LOG_LEVEL=debug
```

## ✅ Checklist

- [ ] `FRONTEND_URL=http://localhost:8080` (votre port frontend)
- [ ] `SUPABASE_URL` rempli
- [ ] `SUPABASE_ANON_KEY` rempli
- [ ] `SUPABASE_SERVICE_ROLE_KEY` rempli
- [ ] `DATABASE_URL` rempli avec le bon mot de passe
- [ ] `JWT_SECRET` et `JWT_REFRESH_SECRET` (déjà générés)

## 🧪 Tester après Configuration

```bash
cd backend
npm run dev
```

Si tout est correct, vous devriez voir :
```
🚀 Server running on port 8000
```

## 🐛 Si vous avez des erreurs

### "Missing required environment variable"
- Vérifiez que toutes les variables Supabase sont remplies
- Vérifiez qu'il n'y a pas d'espaces avant/après les `=`

### "Failed to connect to Supabase"
- Vérifiez que vos credentials sont corrects
- Vérifiez que le schéma SQL a été appliqué dans Supabase Dashboard

### Port déjà utilisé
- Changez `PORT=8000` à un autre port (ex: `PORT=8001`)











