# 🔧 Solution pour le Déploiement Backend sur Render

## ✅ Problème résolu

J'ai créé un fichier `render.yaml` à la **racine** de votre projet qui pointe vers le dossier `backend/` avec la propriété `rootDir: backend`.

## 📋 Deux méthodes de déploiement

### Méthode 1 : Utiliser le fichier render.yaml (Recommandé) ✅

1. **Le fichier `render.yaml` est maintenant à la racine** du projet
2. Dans Render Dashboard :
   - Allez sur **New** → **Blueprint**
   - Connectez votre repo GitHub/GitLab
   - Render détectera automatiquement le `render.yaml`
   - Cliquez sur **Apply**

Render utilisera automatiquement :
- **Root Directory** : `backend`
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`

### Méthode 2 : Configuration manuelle

Si vous préférez créer le service manuellement :

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

## ⚠️ Points importants

### Root Directory
Le **Root Directory** doit être `backend` (pas la racine du repo). C'est crucial car :
- Le `package.json` du backend est dans `backend/`
- Les fichiers TypeScript sont dans `backend/src/`
- Render doit exécuter les commandes depuis `backend/`

### Structure du repo
Votre structure actuelle :
```
AMDA 1.0/
├── render.yaml          ← Nouveau fichier à la racine
├── backend/
│   ├── package.json
│   ├── src/
│   ├── render.yaml      ← Ancien fichier (peut être supprimé)
│   └── ...
├── src/                 ← Frontend
├── package.json         ← Frontend
└── ...
```

## 🔍 Vérification

Après le déploiement, vérifiez que :

1. **Le build fonctionne** :
   - Render doit voir le `package.json` dans `backend/`
   - La commande `npm install` s'exécute dans `backend/`
   - La commande `npm run build` compile TypeScript

2. **Le service démarre** :
   - La commande `npm start` exécute `node dist/server.js`
   - Le serveur écoute sur le port configuré (10000)

3. **Les logs** :
   - Vérifiez les logs Render pour confirmer que tout fonctionne
   - Testez l'endpoint `/health` : `https://votre-backend.onrender.com/health`

## 🐛 Dépannage

### Erreur : "Cannot find package.json"
- **Cause** : Root Directory n'est pas `backend`
- **Solution** : Vérifiez que Root Directory = `backend` dans les settings Render

### Erreur : "Cannot find module"
- **Cause** : Les dépendances ne sont pas installées
- **Solution** : Vérifiez que `npm install` s'exécute bien dans `backend/`

### Erreur : "Cannot find dist/server.js"
- **Cause** : Le build TypeScript a échoué
- **Solution** : Vérifiez les logs de build, corrigez les erreurs TypeScript

## 📝 Variables d'environnement

N'oubliez pas d'ajouter toutes les variables d'environnement dans Render :
- Allez dans votre service → **Environment**
- Ajoutez toutes les variables depuis `backend/env.template`
- Voir `DEPLOYMENT_GUIDE.md` pour la liste complète

## ✅ Résultat attendu

Une fois configuré correctement :
- ✅ Render détecte automatiquement le backend
- ✅ Le build s'exécute dans `backend/`
- ✅ Le service démarre correctement
- ✅ L'API est accessible sur `https://votre-backend.onrender.com`

---

**Note** : Le fichier `backend/render.yaml` peut être supprimé car il n'est plus nécessaire. Le fichier à la racine est suffisant.

