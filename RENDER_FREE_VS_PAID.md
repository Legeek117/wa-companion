# 💰 Plans Render : Free vs Paid

## ⚠️ Message "Payment Information Required"

Si vous voyez ce message lors du déploiement, c'est parce que le `render.yaml` spécifie un plan payant (`starter`).

## 🆓 Plan Free (Gratuit)

### Avantages
- ✅ Gratuit
- ✅ Parfait pour tester et développer
- ✅ Pas besoin de carte bancaire

### Limitations
- ⚠️ Le service s'endort après 15 minutes d'inactivité
- ⚠️ Premier démarrage peut prendre ~30 secondes (réveil)
- ⚠️ 512 MB RAM maximum
- ⚠️ Système de fichiers éphémère (sessions perdues au redémarrage)
- ⚠️ Pas de disque persistant

### Configuration actuelle
Le `render.yaml` est maintenant configuré avec `plan: free` pour permettre un déploiement sans paiement.

## 💎 Plan Starter (Payant - ~$7/mois)

### Avantages
- ✅ Service toujours actif (pas de sommeil)
- ✅ 512 MB RAM (même que free)
- ✅ Disque persistant disponible (pour sauvegarder les sessions WhatsApp)
- ✅ Démarrage instantané
- ✅ Support prioritaire

### Inconvénients
- ❌ Coût mensuel (~$7/mois)
- ❌ Nécessite une carte bancaire

## 🔄 Changer de plan

### Pour utiliser le plan Free (actuel)
Le `render.yaml` est déjà configuré avec `plan: free`. Vous pouvez déployer sans problème.

### Pour passer au plan Starter (production)
1. Modifiez `render.yaml` :
   ```yaml
   plan: starter
   ```

2. Ajoutez le disque persistant (recommandé pour les sessions WhatsApp) :
   ```yaml
   disk:
     name: amda-sessions
     mountPath: /opt/render/project/src/backend/sessions
     sizeGB: 1
   ```

3. Commitez et poussez :
   ```bash
   git add render.yaml
   git commit -m "Upgrade to starter plan"
   git push
   ```

4. Render vous demandera les informations de paiement lors du prochain déploiement.

## 📝 Recommandations

### Pour le développement/test
- ✅ Utilisez le plan **Free**
- ✅ Parfait pour tester le déploiement
- ✅ Pas de coût

### Pour la production
- ✅ Utilisez le plan **Starter** minimum
- ✅ Activez le disque persistant pour les sessions WhatsApp
- ✅ Service toujours disponible

## ⚠️ Important : Sessions WhatsApp avec plan Free

Avec le plan Free, les sessions WhatsApp sont stockées dans Supabase Storage (déjà configuré), donc **pas de problème** même si le système de fichiers est éphémère.

Les médias (View Once, Deleted Messages) sont aussi dans Supabase Storage, donc **tout fonctionne** même avec le plan Free.

## 🎯 Conclusion

**Pour commencer** : Utilisez le plan Free (déjà configuré)
- Pas besoin de carte bancaire
- Parfait pour tester
- Tout fonctionne grâce à Supabase Storage

**Pour la production** : Passez au plan Starter
- Service toujours actif
- Meilleure expérience utilisateur
- Disque persistant optionnel (mais Supabase Storage suffit)

