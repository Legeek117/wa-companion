# 🚀 Déploiement sur Render - AMDA Backend

## 📋 Prérequis

1. Compte Render.com
2. Repository GitHub/GitLab avec votre code
3. Credentials Supabase
4. Credentials Stripe (optionnel pour commencer)

## 🔧 Étapes de Déploiement

### 1. Préparer le Repository

Assurez-vous que votre code est sur GitHub/GitLab :
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

> ℹ️ **Personnalisez chaque valeur** : remplacez `amda-backend.onrender.com`, `amdabot.netlify.app`, `225000000000` ou n'importe quel identifiant par vos propres URLs, domaines et numéros.  
> Pour `ALLOWED_ORIGINS`, vous pouvez fournir plusieurs domaines en les séparant par des virgules (ex. `https://amdabot.netlify.app,https://dashboard.mondomaine.com`).

### 2. Créer un Service Web sur Render

1. Allez sur [render.com](https://render.com)
2. Cliquez sur **"New +"** → **"Web Service"**
3. Connectez votre repository GitHub/GitLab
4. Sélectionnez votre repository `AMDA 1.0`

### 3. Configuration du Service

#### Informations de Base
- **Name** : `amda-backend`
- **Environment** : `Node`
- **Region** : Choisissez la région la plus proche
- **Branch** : `main` (ou votre branche principale)
- **Root Directory** : `backend` (si votre repo contient frontend et backend)

#### Build & Start Commands
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`

#### Plan
- **Starter** : Gratuit (avec limitations)
- **Standard** : Payant (recommandé pour production)

### 4. Variables d'Environnement

Ajoutez toutes les variables suivantes dans **Environment Variables** :

#### Server
```
NODE_ENV=production
PORT=10000
API_URL=https://amda-backend.onrender.com
FRONTEND_URL=https://amdabot.netlify.app
ALLOWED_ORIGINS=https://amdabot.netlify.app
RENDER_KEEP_ALIVE_URL=https://amda-backend.onrender.com/health
RENDER_KEEP_ALIVE_INTERVAL_MS=600000
```

#### Supabase (REQUIRED)
```
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
DATABASE_URL=postgresql://postgres:password@db.votre-projet.supabase.co:5432/postgres
```

#### JWT (REQUIRED)
```
JWT_SECRET=votre-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=votre-super-secret-refresh-key-min-32-characters-long
JWT_REFRESH_EXPIRES_IN=30d
```

#### WhatsApp (REQUIRED)
```
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000
WHATSAPP_PHONE_NUMBER=225000000000
```

#### Sessions Supabase (Recommandé)
```
SUPABASE_STORAGE_BUCKET=whatsapp-sessions
```

#### Stripe (Optionnel - peut être placeholder)
```
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_ID_MONTHLY=price_placeholder_monthly
STRIPE_PRICE_ID_YEARLY=price_placeholder_yearly
```

#### Redis (Optionnel - peut être vide)
```
REDIS_URL=
REDIS_HOST=
REDIS_PORT=6379
```

#### Logging
```
LOG_LEVEL=info
```

> ℹ️ **Personnalisez chaque valeur** : remplacez `amda-backend.onrender.com`, `amdabot.netlify.app`, `225000000000` ou n'importe quel identifiant par vos propres URLs, domaines et numéros.  
> Pour `ALLOWED_ORIGINS`, vous pouvez fournir plusieurs domaines en les séparant par des virgules (ex. `https://amdabot.netlify.app,https://dashboard.mondomaine.com`).

#### Comment les ajouter sur Render ?
1. Dans le dashboard Render, ouvrez votre service backend.
2. Onglet **Environment** → bouton **Add Environment Variable**.
3. Renseignez chaque clé/valeur (copier-coller depuis la liste ci-dessus).  
   - Pour les valeurs longues (ex. clés Supabase), utilisez **Add Secret File** ou collez directement.
4. Cliquez sur **Save Changes** puis redémarrez le service si Render ne le fait pas automatiquement.
5. Répétez l’opération à chaque fois que vous ajoutez une nouvelle variable dans le code (par exemple `ALLOWED_ORIGINS`).

> 🔒 Render chiffre automatiquement les variables. Elles ne sont pas exposées dans le code.

### 5. Configuration Avancée

#### Health Check Path
- **Health Check Path** : `/health`

#### Auto-Deploy
- ✅ **Auto-Deploy** : Activé (déploie automatiquement à chaque push)

### 6. Déployer

1. Cliquez sur **"Create Web Service"**
2. Render va automatiquement :
   - Cloner votre repository
   - Installer les dépendances (`npm install`)
   - Builder le projet (`npm run build`)
   - Démarrer le serveur (`npm start`)

### 7. Vérifier le Déploiement

Une fois déployé, vous devriez voir :
- ✅ **Status** : Live
- ✅ **URL** : `https://amda-backend.onrender.com`

Testez avec :
```bash
curl https://amda-backend.onrender.com/health
```

Vous devriez voir :
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "production"
}
```

## 🔧 Configuration Post-Déploiement

### 1. Mettre à jour FRONTEND_URL

Dans votre frontend, mettez à jour l'URL de l'API :
```env
VITE_API_URL=https://amda-backend.onrender.com
```

### 2. Mettre à jour CORS

Le CORS est déjà configuré pour accepter votre `FRONTEND_URL`.

### 3. Webhooks Stripe (si nécessaire)

Si vous utilisez Stripe, configurez le webhook :
- **URL** : `https://amda-backend.onrender.com/api/subscription/webhook`
- **Events** : Tous les événements d'abonnement

## ⚠️ Notes Importantes

### Redis
- **Redis n'est PAS obligatoire** - Le serveur fonctionne sans Redis
- Si vous voulez utiliser Redis plus tard, vous pouvez ajouter un service Redis sur Render

### Sessions WhatsApp
- Les sessions WhatsApp sont stockées dans `./sessions/`
- Sur Render, ces fichiers sont persistants mais peuvent être perdus lors d'un redéploiement
- **Recommandation** : Utiliser un stockage externe (S3, Cloudinary) pour les sessions

### Limitations du Plan Gratuit
- Le service peut s'endormir après 15 minutes d'inactivité
- Le premier démarrage peut prendre 30-60 secondes
- Limite de 750 heures/mois

### Plan Payant (Recommandé)
- Service toujours actif
- Démarrage rapide
- Pas de limitations d'heures

## 🐛 Dépannage

### Le service ne démarre pas
1. Vérifiez les logs dans Render Dashboard
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez que `npm run build` fonctionne localement

### Erreur "Missing required environment variable"
- Vérifiez que toutes les variables Supabase et JWT sont définies

### Erreur de connexion à Supabase
- Vérifiez vos credentials Supabase
- Vérifiez que le schéma SQL a été appliqué

### Le service s'endort
- C'est normal avec le plan gratuit
- Le service se réveille automatiquement à la première requête
- Utilisez un service de monitoring (UptimeRobot) pour le garder actif

## ✅ Checklist de Déploiement

- [ ] Code pushé sur GitHub/GitLab
- [ ] Service créé sur Render
- [ ] Variables d'environnement configurées
- [ ] Build réussi
- [ ] Service démarré
- [ ] Health check fonctionne (`/health`)
- [ ] API fonctionne (`/api/auth/register`)
- [ ] Frontend connecté à l'API

## 🎉 Félicitations !

Votre backend est maintenant déployé sur Render ! 🚀









