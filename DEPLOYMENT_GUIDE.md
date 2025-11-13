# 🚀 Guide de Déploiement AMDA

Ce guide vous explique comment déployer AMDA sur Netlify (frontend) et Render (backend).

## 📋 Prérequis

1. **Compte Supabase** avec :
   - Base de données PostgreSQL configurée
   - Storage bucket créé (nom: `amda-media`)
   - Clés API (ANON_KEY et SERVICE_ROLE_KEY)

2. **Compte Netlify** (gratuit)
3. **Compte Render** (gratuit ou payant)
4. **Compte Stripe** (pour les paiements)

---

## 🔧 Configuration Supabase Storage

### 1. Créer le bucket de stockage

1. Allez dans votre projet Supabase → **Storage**
2. Cliquez sur **New bucket**
3. Nom : `amda-media`
4. **Public bucket** : ✅ Activé (pour accéder aux médias)
5. Cliquez sur **Create bucket**

### 2. Configurer les politiques RLS

Dans Supabase → **Storage** → **Policies** pour le bucket `amda-media` :

```sql
-- Policy pour permettre l'upload (service role uniquement)
CREATE POLICY "Service role can upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'amda-media');

-- Policy pour permettre la lecture publique
CREATE POLICY "Public can read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'amda-media');
```

---

## 🌐 Déploiement Frontend (Netlify)

### 1. Préparer le projet

Le projet est déjà configuré avec `netlify.toml`. Assurez-vous que :
- ✅ `vite.config.ts` contient la configuration PWA
- ✅ `netlify.toml` est présent à la racine
- ✅ Les icônes PWA sont dans `/public`

### 2. Variables d'environnement Netlify

Dans Netlify → **Site settings** → **Environment variables**, ajoutez :

```
VITE_API_URL=https://votre-backend.render.com
```

### 3. Déployer

**Option A : Via Git (recommandé)**
1. Connectez votre repo GitHub/GitLab à Netlify
2. Netlify détectera automatiquement la configuration
3. Le build se lancera automatiquement

**Option B : Via Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### 4. Vérifier le PWA

1. Ouvrez votre site déployé
2. Ouvrez les DevTools (F12) → **Application** → **Service Workers**
3. Vous devriez voir le service worker enregistré
4. Testez l'installation PWA :
   - Chrome/Edge : Icône d'installation dans la barre d'adresse
   - Mobile : Menu du navigateur → "Ajouter à l'écran d'accueil"

---

## ⚙️ Déploiement Backend (Render)

### 1. Préparer le projet

Le fichier `render.yaml` est déjà configuré dans `/backend`.

### 2. Créer le service sur Render

**Option A : Utiliser le Blueprint (Recommandé) ✅**

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **New** → **Blueprint**
3. Connectez votre repo GitHub/GitLab
4. Sélectionnez le repo **AMDA 1.0**
5. Render détectera automatiquement le fichier `render.yaml` à la racine
6. Cliquez sur **Apply**
7. Render créera automatiquement le service avec la bonne configuration

**Option B : Configuration manuelle**

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **New** → **Web Service**
3. Connectez votre repo GitHub/GitLab
4. Sélectionnez le repo **AMDA 1.0**
5. Configurez :
   - **Name** : `amda-backend`
   - **Root Directory** : `backend` ⚠️ **IMPORTANT**
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`

### 3. Variables d'environnement Render

Dans Render → **Environment**, ajoutez toutes les variables depuis `backend/env.template` :

```
NODE_ENV=production
PORT=10000
API_URL=https://votre-backend.render.com
FRONTEND_URL=https://votre-site.netlify.app
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
DATABASE_URL=postgresql://...
SUPABASE_STORAGE_BUCKET=amda-media
JWT_SECRET=votre-jwt-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=votre-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
LOG_LEVEL=info
REDIS_URL=redis://... (optionnel)
```

### 4. Générer les secrets JWT

Sur votre machine locale :
```bash
cd backend
npm run generate-secrets
```

Copiez les secrets générés dans les variables d'environnement Render.

### 5. Déployer

1. Cliquez sur **Create Web Service**
2. Render va builder et déployer automatiquement
3. Notez l'URL du service (ex: `https://amda-backend.onrender.com`)

### 6. Configurer le Keep-Alive (optionnel)

Pour éviter que le service free tier s'endorme, configurez `RENDER_KEEP_ALIVE_URL` avec l'URL de votre service.

---

## ✅ Vérifications Post-Déploiement

### Frontend
- [ ] Site accessible sur Netlify
- [ ] PWA installable (icône dans la barre d'adresse)
- [ ] Service Worker enregistré
- [ ] Manifest.json accessible
- [ ] Connexion API fonctionnelle

### Backend
- [ ] API accessible (test: `https://votre-backend.render.com/health`)
- [ ] Base de données connectée
- [ ] Supabase Storage accessible
- [ ] WhatsApp QR code générable
- [ ] Authentification fonctionnelle

### Intégration
- [ ] Frontend peut se connecter au backend (CORS OK)
- [ ] Authentification fonctionne
- [ ] WhatsApp se connecte
- [ ] Upload de médias vers Supabase Storage fonctionne

---

## 🔒 Sécurité

### Variables sensibles
- ✅ Ne jamais commiter les `.env` files
- ✅ Utiliser les variables d'environnement des plateformes
- ✅ Régénérer les secrets JWT en production
- ✅ Utiliser les clés Stripe en mode production

### CORS
Le backend est configuré pour accepter uniquement :
- Votre domaine Netlify (FRONTEND_URL)
- Les origines supplémentaires (ALLOWED_ORIGINS)

---

## 🐛 Dépannage

### PWA ne s'installe pas
1. Vérifiez que le service worker est enregistré (DevTools → Application)
2. Vérifiez que `manifest.json` est accessible
3. Vérifiez les headers dans `netlify.toml`
4. Testez en navigation privée (cache)

### Backend ne démarre pas
1. Vérifiez les logs Render
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez la connexion à Supabase
4. Vérifiez que le bucket `amda-media` existe

### Médias ne s'affichent pas
1. Vérifiez que le bucket Supabase est public
2. Vérifiez les politiques RLS du bucket
3. Vérifiez que `SUPABASE_STORAGE_BUCKET` est défini
4. Vérifiez les logs backend pour les erreurs d'upload

### WhatsApp ne se connecte pas
1. Vérifiez que les sessions sont sauvegardées dans Supabase Storage
2. Vérifiez les logs backend
3. Vérifiez que `WHATSAPP_SESSION_PATH` est défini
4. Testez avec le QR code et le pairing code

---

## 📝 Notes Importantes

### Render Free Tier
- ⚠️ Le service s'endort après 15 min d'inactivité
- ⚠️ Premier démarrage peut prendre ~30 secondes
- ✅ Utilisez le plan Starter pour la production

### Supabase Storage
- ✅ Gratuit jusqu'à 1 GB
- ✅ Payant au-delà (très abordable)
- ✅ CDN inclus

### Netlify
- ✅ Gratuit avec limitations généreuses
- ✅ CDN global
- ✅ HTTPS automatique

---

## 🎉 Félicitations !

Votre application AMDA est maintenant déployée et prête à être utilisée !

Pour toute question, consultez la documentation ou contactez le support.

