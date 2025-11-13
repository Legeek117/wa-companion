# 🔧 Configuration Variables d'Environnement Netlify

## ⚠️ Problème actuel

Votre frontend essaie de se connecter à `http://localhost:3000` au lieu de votre backend Render, ce qui cause l'erreur `ERR_CONNECTION_REFUSED`.

## ✅ Solution : Configurer VITE_API_URL sur Netlify

### Étape 1 : Obtenir l'URL de votre backend Render

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Ouvrez votre service `amda-backend`
3. Copiez l'URL du service (ex: `https://amda-backend.onrender.com`)

### Étape 2 : Ajouter la variable d'environnement sur Netlify

1. Allez sur [Netlify Dashboard](https://app.netlify.com)
2. Sélectionnez votre site
3. Allez dans **Site settings** → **Environment variables**
4. Cliquez sur **Add a variable**
5. Ajoutez :
   - **Key** : `VITE_API_URL`
   - **Value** : `https://votre-backend.onrender.com` (remplacez par votre URL Render)
6. Cliquez sur **Save**

### Étape 3 : Redéployer le site

Après avoir ajouté la variable, Netlify doit redéployer :

1. Allez dans **Deploys**
2. Cliquez sur **Trigger deploy** → **Deploy site**
3. Attendez que le déploiement se termine

**OU** si vous avez connecté votre repo Git :
- Faites un commit vide ou modifiez un fichier
- Poussez sur GitHub
- Netlify redéploiera automatiquement

## 🔍 Vérification

Après le redéploiement :

1. Ouvrez votre site Netlify
2. Ouvrez les DevTools (F12) → **Console**
3. Vérifiez que les requêtes vont vers votre backend Render (pas localhost)
4. Testez la connexion : l'erreur `ERR_CONNECTION_REFUSED` devrait disparaître

## 📝 Variables d'environnement importantes

### Pour le Frontend (Netlify)

```
VITE_API_URL=https://votre-backend.onrender.com
```

⚠️ **Important** : Les variables Vite doivent commencer par `VITE_` pour être accessibles dans le code frontend.

### Pour le Backend (Render)

Toutes les variables depuis `backend/env.template` :
- `NODE_ENV=production`
- `PORT=10000`
- `API_URL=https://votre-backend.onrender.com`
- `FRONTEND_URL=https://votre-site.netlify.app`
- `SUPABASE_URL=...`
- etc.

## 🐛 Dépannage

### Erreur persiste après configuration

1. **Vérifiez que la variable est bien définie** :
   - Netlify Dashboard → Site settings → Environment variables
   - Vérifiez que `VITE_API_URL` est présent

2. **Vérifiez l'URL du backend** :
   - Testez l'URL dans votre navigateur : `https://votre-backend.onrender.com/health`
   - Devrait retourner `{"status":"ok"}`

3. **Vérifiez CORS sur le backend** :
   - Assurez-vous que `FRONTEND_URL` dans Render pointe vers votre site Netlify
   - Format : `https://votre-site.netlify.app`

4. **Redéployez le frontend** :
   - Les variables d'environnement sont injectées au moment du build
   - Un nouveau déploiement est nécessaire après modification

### Les fichiers CSS/JS retournent 404

Cela peut être dû à :
- Un problème de build
- Des chemins incorrects dans le build
- Un problème de cache

**Solution** :
1. Vérifiez que le build fonctionne localement : `npm run build`
2. Vérifiez les logs de déploiement Netlify
3. Videz le cache du navigateur (Ctrl+Shift+R)

## ✅ Checklist

- [ ] Variable `VITE_API_URL` ajoutée sur Netlify
- [ ] URL pointe vers le backend Render (pas localhost)
- [ ] Site redéployé après ajout de la variable
- [ ] Backend accessible (test `/health`)
- [ ] CORS configuré sur le backend
- [ ] Plus d'erreurs `ERR_CONNECTION_REFUSED`

---

**Note** : Les variables d'environnement Vite sont intégrées au moment du build. Si vous modifiez une variable, vous devez redéployer le site.

