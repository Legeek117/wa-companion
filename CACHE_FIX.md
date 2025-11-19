# 🔧 Solution pour Voir les Modifications après le Build

## Problème
Les modifications ne sont pas visibles après le build à cause du cache du navigateur ou du service worker.

## Solutions

### Solution 1 : Hard Refresh du Navigateur (Rapide)

**Sur Windows/Linux** :
- `Ctrl + Shift + R` ou `Ctrl + F5`

**Sur Mac** :
- `Cmd + Shift + R`

**Ou** :
1. Ouvrez les DevTools (F12)
2. Clic droit sur le bouton de rafraîchissement
3. Sélectionnez "Vider le cache et actualiser de force"

### Solution 2 : Désactiver le Cache dans DevTools

1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet **Network**
3. Cochez **"Disable cache"**
4. Gardez les DevTools ouverts et rafraîchissez la page

### Solution 3 : Vider le Cache du Service Worker

1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet **Application** (ou **Storage**)
3. Dans le menu de gauche, cliquez sur **Service Workers**
4. Cliquez sur **Unregister** pour désinscrire le service worker
5. Allez dans **Cache Storage** et supprimez tous les caches
6. Rafraîchissez la page

### Solution 4 : Mode Navigation Privée

Ouvrez votre site en mode navigation privée/incognito pour voir les changements sans cache.

### Solution 5 : Rebuild et Redéployer

Si vous êtes sur Netlify, après avoir fait les modifications :

```bash
# Nettoyer le build précédent
rm -rf dist

# Rebuild
npm run build

# Commiter et pousser
git add .
git commit -m "Update: Fix cache issues"
git push
```

Netlify redéploiera automatiquement avec les nouvelles modifications.

## Vérification

Pour vérifier que les modifications sont bien présentes :

1. **Vérifiez les prix** : Devraient être à "1500f" et "0f"
2. **Vérifiez les images** : 
   - Hero section : Image du dashboard WhatsApp
   - Section Features : 3 images différentes
3. **Vérifiez le logo** : Logo AMDA dans la hero section

## Si ça ne fonctionne toujours pas

1. Vérifiez que les images sont bien dans `public/` :
   - `dashboard-whatsapp.png`
   - `dashboard-status.png`
   - `dashboard-viewonce.png`

2. Vérifiez le code dans `src/pages/Landing.tsx` :
   - Ligne 142 : `src="/dashboard-whatsapp.png"`
   - Ligne 186 : `src="/dashboard-status.png"`
   - Ligne 192 : `src="/dashboard-viewonce.png"`
   - Ligne 279 : `1500f`

3. Vérifiez que le build a bien été fait :
   ```bash
   npm run build
   ```

4. Si vous êtes sur Netlify, vérifiez les logs de déploiement pour voir si le build a réussi.

