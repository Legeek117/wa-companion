# 🔧 Solution pour l'erreur "Cannot find module '../../package.json'" sur Render

## 🐛 Problème

Render essaie d'exécuter `npm install` depuis la racine du projet AVANT d'appliquer `rootDir: backend`, ce qui cause l'erreur :
```
Error: Cannot find module '../../package.json'
```

## ✅ Solution : Configuration manuelle dans Render Dashboard

Le fichier `render.yaml` avec `rootDir: backend` ne fonctionne pas correctement car Render exécute npm avant d'appliquer le rootDir.

### Étapes pour corriger :

1. **Allez sur [Render Dashboard](https://dashboard.render.com)**
2. **Sélectionnez votre service `amda-backend`**
3. **Allez dans "Settings"**
4. **Trouvez la section "Build & Deploy"**
5. **Configurez manuellement :**
   - **Root Directory** : `backend` ⚠️ **CRUCIAL**
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
6. **Sauvegardez les changements**
7. **Redéployez le service**

## 🔄 Alternative : Utiliser un script shell

Si la configuration manuelle ne fonctionne pas, vous pouvez utiliser le script shell :

1. Le fichier `.render-build.sh` à la racine est déjà créé
2. Modifiez `render.yaml` pour utiliser :
   ```yaml
   buildCommand: bash .render-build.sh
   ```

## 📝 Note importante

Le fichier `render.yaml` avec `rootDir: backend` devrait fonctionner, mais il semble y avoir un bug avec Render qui exécute npm avant d'appliquer le rootDir. La configuration manuelle dans le dashboard est la solution la plus fiable.

