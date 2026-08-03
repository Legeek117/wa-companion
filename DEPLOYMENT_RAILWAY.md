# Guide Déploiement - AMDA sur Railway

## 🚀 Architecture Finale

- **Frontend**: Netlify (Vite React PWA, inchangé)
- **Backend**: Railway - Node.js/Express direct
- **Database**: Railway - PostgreSQL managé
- **Storage**: Filesystem local (volume Railway persistant)
- **Sessions**: Volume persistant Railway (`/app/sessions`)

---

## Prérequis

1. Compte Railway (railway.app)
2. Domaine personnalisé (optionnel, mais recommandé)
3. Repository GitHub push-ready
4. Variables d'environnement préparées

---

## Étape 1 : Préparer le Repository

### 1.1 Nettoyer les fichiers Supabase

```bash
cd /home/le_geek/Téléchargements/wa-companion
rm -rf backend/supabase/*  # Supprimer migrations Supabase (obsolètes)
rm backend/src/integrations/supabase -rf  # Frontend - code mort
```

### 1.2 Vérifier les .gitignore

```bash
# backend/.gitignore - doit ignorer
# ✅ uploads/
# ✅ sessions/
# ✅ .env
```

### 1.3 Push vers GitHub

```bash
git add -A
git commit -m "Backend refactor: Supabase → PostgreSQL + Prisma + local storage"
git push origin main
```

---

## Étape 2 : Créer les Services Railway

### 2.1 PostgreSQL Plugin

1. **Sur railway.app**, créer nouveau project
2. **Add Service** → Postgres
3. Copy `DATABASE_URL` depuis onglet "Connect"
4. C'est le `postgresql://user:pass@host:5432/amda`

### 2.2 Backend Service

1. **Add Service** → GitHub Repo → sélectionner le repo
2. **Service name**: `amda-backend`
3. **Root directory**: `backend`
4. **Start command**: `npm run build && npm run prisma:migrate && npm start`

### 2.3 Configurer les Volumes

**Pour persister sessions et uploads** :

1. Dans Backend service, onglet **Settings** → **Volumes**
2. Créer deux volumes :
   - Mount path: `/app/sessions` → Railway auto-génère path
   - Mount path: `/app/uploads` → Railway auto-génère path
3. Sauvegarder

---

## Étape 3 : Variables d'Environnement

### 3.1 Générer les Secrets

Sur ta machine locale :

```bash
# Générer JWT secrets (min 32 caractères)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Répète 2x pour JWT_SECRET et JWT_REFRESH_SECRET
```

Exemples (À REMPLACER avec tes vraies valeurs) :
```
abc123def456...  ← JWT_SECRET
xyz789uvw012...  ← JWT_REFRESH_SECRET
```

### 3.2 Configurer dans Railway

**Backend service → Variables**

Ajouter :

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:...(from Postgres plugin)
JWT_SECRET=<generated-32-char-hex>
JWT_REFRESH_SECRET=<generated-32-char-hex>
JWT_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN=7d
API_URL=https://api.tondomaine.com  # (ou Railroad domain temporaire)
FRONTEND_URL=https://tonapp.netlify.app
ALLOWED_ORIGINS=https://tonapp.netlify.app
WHATSAPP_SESSION_PATH=/app/sessions
UPLOADS_PATH=/app/uploads
LOG_LEVEL=info
STRIPE_SECRET_KEY=sk_test_...  # (optionnel, reste comme est)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
REDIS_URL=redis://localhost:6379  # (optionnel, dégradé gracieux)
```

⚠️ **Note Stripe & Firebase** : ces valeurs existent déjà en `.env`. Les garder ou laisser placeholders si tu testes juste.

---

## Étape 4 : First Deploy

1. **Push un commit** ou **Redeploy** manuellement dans Railway
2. **Logs** → vérifier qu'aucune erreur à startup :
   ```
   ✅ Prisma migrations applied
   ✅ Server running on :3000
   ✅ /uploads directory created
   ✅ /sessions directory created
   ```

### 4.1 Tester l'API

```bash
# Health check
curl https://api.tondomaine.com/health

# Signup
curl -X POST https://api.tondomaine.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'
```

---

## Étape 5 : Connecter le Frontend

### 5.1 Netlify Environment

1. **Netlify site** → **Site settings** → **Build & deploy** → **Environment**
2. Ajouter :
   ```
   VITE_API_URL=https://api.tondomaine.com
   ```
3. Redéployer

### 5.2 Tester le Login Frontend

1. Ouvrir https://tonapp.netlify.app
2. **Sign up** → doit créer user en DB PostgreSQL
3. **Dashboard** → doit charger ses données

---

## Étape 6 : Domaine Personnalisé (Optionnel)

### 6.1 Si tu as un domaine

1. **Railway → Backend service → Settings → Domains**
2. Ajouter `api.tondomaine.com`
3. Suivre les instructions DNS (CNAMEvers Railway domain)
4. Attendre ~15min pour la propagation

### 6.2 HTTPS Automatique

Railway gère Let's Encrypt automatiquement. Pas d'action requise.

---

## Étape 7 : Test Complet

### 7.1 Scénario Frontend

1. Sign up avec email/password → vérifier quota créé en DB
2. Aller dans **/settings** → vérifier données user chargées
3. Uploader un média (si applicable) → vérifier fichier en `/uploads`
4. Logout et login → vérifier JWT token valide

### 7.2 Scénario WhatsApp

1. **Dashboard → Connect** → scanner QR avec téléphone
2. Vérifier session créée en DB (table `whatsapp_sessions`)
3. Vérifier session data en `/sessions/<userId>/`
4. Envoyer/recevoir un message → logs sans erreur

### 7.3 Vérifier Volumes

SSH dans le conteneur (si dispo):

```bash
railway shell
ls -la /app/sessions/
ls -la /app/uploads/
```

---

## Dépannage

### ❌ "DATABASE_URL not set"

→ Ajouter `DATABASE_URL` dans Railway **Variables**

### ❌ "Failed to create uploads directory"

→ Le volume `/app/uploads` est peut-être pas mounté. Vérifier **Volumes** dans settings.

### ❌ "EACCES: permission denied"

→ Railway utilise un user non-root. Permissions `/app/sessions` et `/app/uploads` doivent être 755+. Vérifier Dockerfile.

### ❌ Session WhatsApp perdue après redeploy

→ Le volume n'a pas persisté. Vérifier que le volume est bien déclaré dans Railway avant de redéployer.

### ❌ Login fails avec "Invalid token"

→ `JWT_SECRET` ou `JWT_REFRESH_SECRET` changés après redeploy. Régénérer et redéployer.

---

## Maintenance

### Backups PostgreSQL

Railway PostgreSQL a des backups automatiques. Accéder via :
- **PostgreSQL service → Backups** dans Railway dashboard

### Logs

```bash
# Terminal local (si Railway CLI installé)
railway logs --service amda-backend

# Ou via Railway dashboard → Backend → Logs
```

### Scaling

Par défaut : 1x dyno Railway. Pour plus de puissance :
- **Backend service → Settings → Plan** → upgrade
- Redéployer automatiquement

---

## Résumé Checklist

- [x] Supprimer fichiers Supabase
- [x] Push vers GitHub
- [ ] Créer PostgreSQL sur Railway
- [ ] Créer Backend service sur Railway
- [ ] Ajouter volumes (`/app/sessions`, `/app/uploads`)
- [ ] Configurer variables d'env
- [ ] Générer JWT secrets
- [ ] First deploy & vérifier logs
- [ ] Tester API health check
- [ ] Configurer Netlify VITE_API_URL
- [ ] Tester frontend login
- [ ] Tester WhatsApp connect
- [ ] Vérifier volumes persist après redeploy
- [ ] (Optionnel) Configurer domaine personnalisé

---

## Support

Problèmes ? Vérifier logs :

```bash
railway logs --service amda-backend --tail
```

Ou ouvrir issue sur le repo avec les logs d'erreur.
