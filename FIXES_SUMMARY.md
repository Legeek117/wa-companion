# 🔧 Résumé des Corrections

## ✅ Problèmes Résolus

### 1. Erreur ERR_CONNECTION_REFUSED (localhost:3000)

**Problème** : Le frontend sur Netlify essayait toujours de se connecter à `localhost:3000` au lieu du backend Render.

**Solution** :
- ✅ Mis à jour `src/lib/api.ts` pour utiliser `https://amda-backend-3aji.onrender.com` par défaut
- ✅ Mis à jour `src/pages/DeletedMessages.tsx` avec la même URL
- ✅ Mis à jour `src/pages/StatusList.tsx` avec la même URL

**Note** : Si le problème persiste après le redéploiement, c'est probablement un problème de cache. Videz le cache du navigateur ou faites un hard refresh (Ctrl+Shift+R).

### 2. Commande .vv envoie un message à l'expéditeur

**Problème** : La commande `.vv` renvoyait le média capturé dans le chat, notifiant l'expéditeur.

**Solution** :
- ✅ Modifié `backend/src/services/viewOnce.service.ts` pour supprimer l'envoi de message
- ✅ Modifié `backend/src/services/autoresponder.service.ts` pour utiliser le mode `dashboard` (silencieux)
- ✅ Le View Once est maintenant capturé silencieusement et sauvegardé uniquement dans le dashboard

### 3. Configuration de la commande View Once

**Problème** : L'utilisateur voulait pouvoir configurer la commande View Once (texte et emoji).

**Solution** :
- ✅ Créé la table `view_once_command_config` dans `backend/supabase/schema.sql`
- ✅ Créé le service `backend/src/services/viewOnceCommand.service.ts`
- ✅ Créé le contrôleur `backend/src/controllers/viewOnceCommand.controller.ts`
- ✅ Ajouté les routes dans `backend/src/routes/viewOnce.routes.ts`
- ✅ Ajouté l'API frontend dans `src/lib/api.ts`
- ✅ Ajouté l'interface de configuration dans `src/pages/Settings.tsx` (onglet Préférences)
- ✅ Modifié `backend/src/services/autoresponder.service.ts` pour utiliser la configuration personnalisée

**Fonctionnalités** :
- Commande texte personnalisable (par défaut: `.vv`)
- Commande emoji optionnelle (ex: 👀)
- Activation/désactivation de la capture
- Configuration accessible dans Paramètres → Préférences

### 4. Installation PWA sur mobile

**Problème** : Le PWA ne s'installait pas sur mobile, pas de message d'installation.

**Solution** :
- ✅ Mis à jour `vite.config.ts` avec les bonnes configurations PWA
- ✅ Mis à jour `public/manifest.json` avec les bonnes propriétés
- ✅ Ajouté les meta tags Apple dans `index.html`
- ✅ Ajouté le script de registration du service worker dans `src/main.tsx`
- ✅ Configuré `netlify.toml` avec les bons headers pour le service worker

**Pour installer sur mobile** :
1. Ouvrez le site sur votre navigateur mobile (Chrome/Safari)
2. Sur Android (Chrome) : Menu → "Ajouter à l'écran d'accueil"
3. Sur iOS (Safari) : Partager → "Sur l'écran d'accueil"
4. Le bouton d'installation devrait apparaître automatiquement si les critères sont remplis

## 📋 Prochaines Étapes

### 1. Exécuter le schéma SQL sur Supabase

Exécutez le fichier `backend/supabase/schema.sql` sur votre base de données Supabase pour créer la table `view_once_command_config`.

### 2. Redéployer le backend sur Render

```bash
git add .
git commit -m "Add View Once command configuration and fix silent capture"
git push
```

### 3. Redéployer le frontend sur Netlify

Le redéploiement se fera automatiquement après le push, ou vous pouvez déclencher un redéploiement manuel depuis le dashboard Netlify.

### 4. Vérifier la configuration CORS sur Render

Assurez-vous que la variable d'environnement `FRONTEND_URL` est configurée sur Render avec l'URL de votre site Netlify.

### 5. Tester

1. **Test de la commande View Once** :
   - Allez dans Paramètres → Préférences
   - Configurez votre commande (texte et/ou emoji)
   - Envoyez un message View Once à votre bot
   - Répondez avec votre commande configurée
   - Vérifiez que le View Once est capturé silencieusement (pas de message envoyé)

2. **Test du PWA** :
   - Ouvrez le site sur mobile
   - Vérifiez que le bouton d'installation apparaît
   - Installez l'application
   - Vérifiez que l'icône apparaît sur l'écran d'accueil

3. **Test de l'API** :
   - Vérifiez que les requêtes vont bien vers `https://amda-backend-3aji.onrender.com`
   - Vérifiez qu'il n'y a plus d'erreur `ERR_CONNECTION_REFUSED`

## 🔍 Dépannage

### Si localhost:3000 est toujours utilisé

1. Videz le cache du navigateur (Ctrl+Shift+Delete)
2. Faites un hard refresh (Ctrl+Shift+R)
3. Vérifiez que le build Netlify utilise bien les nouvelles valeurs
4. Vérifiez la variable d'environnement `VITE_API_URL` sur Netlify (elle devrait être vide ou pointer vers Render)

### Si le PWA ne s'installe pas

1. Vérifiez que le site est en HTTPS (obligatoire pour PWA)
2. Vérifiez que le service worker est bien enregistré (Console → Application → Service Workers)
3. Vérifiez que le manifest.json est accessible (Console → Application → Manifest)
4. Sur iOS, le PWA doit être ajouté manuellement via le menu Partager

### Si la commande View Once ne fonctionne pas

1. Vérifiez que la table `view_once_command_config` existe dans Supabase
2. Vérifiez que la configuration est bien enregistrée (Paramètres → Préférences)
3. Vérifiez les logs du backend pour voir si la commande est détectée
4. Assurez-vous que WhatsApp est bien connecté

## 📝 Notes

- La commande par défaut est `.vv` mais peut être changée
- L'emoji est optionnel mais peut être utilisé seul ou en complément
- La capture est maintenant 100% silencieuse (pas de message envoyé)
- Le PWA nécessite HTTPS pour fonctionner (Netlify le fournit automatiquement)

