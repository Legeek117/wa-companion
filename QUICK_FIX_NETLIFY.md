# 🚀 Correction Rapide : Erreur ERR_CONNECTION_REFUSED

## ✅ Corrections effectuées

J'ai mis à jour tous les fichiers pour utiliser l'URL Render par défaut :

1. ✅ `src/lib/api.ts` - URL par défaut changée vers `https://amda-backend-3aji.onrender.com`
2. ✅ `src/pages/DeletedMessages.tsx` - URL par défaut changée
3. ✅ `src/pages/StatusList.tsx` - URL par défaut changée

## 📋 Prochaines étapes

### 1. Commitez et poussez les changements

```bash
git add src/lib/api.ts src/pages/DeletedMessages.tsx src/pages/StatusList.tsx
git commit -m "Update API URL to Render backend"
git push
```

### 2. Netlify redéploiera automatiquement

Une fois poussé, Netlify détectera les changements et redéploiera automatiquement.

### 3. Vérifiez la configuration CORS sur Render

Assurez-vous que dans Render → Environment variables, vous avez :

```
FRONTEND_URL=https://votre-site.netlify.app
```

Remplacez `votre-site.netlify.app` par l'URL réelle de votre site Netlify.

## 🔍 Vérification

Après le redéploiement :

1. Ouvrez votre site Netlify
2. Ouvrez la console (F12)
3. Les requêtes doivent maintenant aller vers `https://amda-backend-3aji.onrender.com`
4. Plus d'erreur `ERR_CONNECTION_REFUSED`

## ⚠️ Important

- L'URL est maintenant codée en dur dans le code comme fallback
- La variable `VITE_API_URL` sur Netlify peut toujours être utilisée pour override
- Pour le développement local, vous pouvez créer un fichier `.env.local` avec `VITE_API_URL=http://localhost:3000`

## 🎯 Résultat

Maintenant, même si la variable d'environnement n'est pas configurée sur Netlify, le site utilisera automatiquement votre backend Render ! 🎉

