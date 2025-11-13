# 🚀 Configuration Rapide du .env

## 📝 Étapes

### 1. Créer le fichier `.env`

Dans le dossier `backend/`, créez un fichier nommé `.env` (sans extension)

### 2. Copier le contenu

Copiez le contenu du fichier `.env.example` dans votre `.env`

### 3. Remplir vos credentials Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Copiez les valeurs suivantes :

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANT** : `SUPABASE_SERVICE_ROLE_KEY` est très sensible, ne l'exposez jamais au frontend !

### 4. Les clés JWT sont déjà générées

Les clés JWT dans `.env.example` sont déjà générées et sécurisées. Vous pouvez les utiliser telles quelles.

### 5. Vérifier le port frontend

Assurez-vous que `FRONTEND_URL=http://localhost:8080` correspond à votre port frontend.

## ✅ Template Minimal pour Tester

Si vous voulez juste tester rapidement, voici le minimum requis :

```env
NODE_ENV=development
PORT=8000
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8080

SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
DATABASE_URL=postgresql://postgres:password@db.votre-projet.supabase.co:5432/postgres

JWT_SECRET=9e634c167fb3912844010de7a4cebd8506d7bf0cc7a7804c700dcbf2360ac18f
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=a7f68bbcfd779851f64c57c16d86e8619466fbddf87c70e824f77575cb330479
JWT_REFRESH_EXPIRES_IN=30d

WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000

STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_MONTHLY=price_placeholder_monthly
STRIPE_PRICE_ID_YEARLY=price_placeholder_yearly

LOG_LEVEL=debug
```

## 🧪 Tester

Après avoir créé le `.env`, testez :

```bash
cd backend
npm run dev
```

Si tout est correct, vous devriez voir :
```
🚀 Server running on port 8000
```

## 🐛 Problèmes Courants

### "Missing required environment variable"
- Vérifiez que le fichier `.env` existe dans `backend/`
- Vérifiez que toutes les variables Supabase sont remplies

### "Failed to connect to Supabase"
- Vérifiez que vos credentials sont corrects
- Vérifiez que le schéma SQL a été appliqué dans Supabase

### Port déjà utilisé
- Changez `PORT=8000` à un autre port (ex: `PORT=8001`)











