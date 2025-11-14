# 🔧 Correction du Problème 404 pour les Médias View Once

## Problème

L'erreur `404 (Not Found)` se produit parce que le frontend essaie d'accéder aux médias depuis Netlify au lieu de Render :

```
GET https://amdabot.netlify.app/api/media/view-once/... 404 (Not Found)
```

## Cause

Le backend retourne des URLs relatives comme `/api/media/view-once/...` qui doivent être servies par le backend Render, pas par Netlify.

## Solution Appliquée

J'ai ajouté la fonction `buildMediaUrl` dans `src/pages/ViewOnce.tsx` qui :

1. **Vérifie si l'URL est déjà complète** (commence par `http://` ou `https://`)
   - Si oui, retourne l'URL telle quelle
   
2. **Si l'URL est relative** (commence par `/api/...`)
   - Ajoute l'API_URL (qui pointe vers Render) : `https://amda-backend-3aji.onrender.com`

## Modifications Effectuées

### Fichier : `src/pages/ViewOnce.tsx`

1. ✅ Ajout de la constante `API_URL`
2. ✅ Ajout de la fonction `buildMediaUrl`
3. ✅ Utilisation de `buildMediaUrl` dans `handleViewMedia`
4. ✅ Utilisation de `buildMediaUrl` pour les images dans la galerie

## Résultat

Maintenant, les URLs sont construites correctement :
- **Avant** : `https://amdabot.netlify.app/api/media/view-once/...` ❌
- **Après** : `https://amda-backend-3aji.onrender.com/api/media/view-once/...` ✅

## Vérification

Pour vérifier que ça fonctionne :

1. **Rebuild le frontend** :
   ```bash
   npm run build
   ```

2. **Redéployer sur Netlify** (ou commit + push si auto-deploy)

3. **Tester** :
   - Allez sur la page View Once
   - Les images devraient maintenant se charger correctement
   - Plus d'erreur 404 dans la console

## Note

Cette même fonction `buildMediaUrl` existe déjà dans `DeletedMessages.tsx` et fonctionne correctement. J'ai simplement appliqué la même logique à `ViewOnce.tsx`.

