# 🚀 Migration Cloudinary sur Render - Guide Rapide

## ✅ Solution : Endpoint Admin

**Render peut déclencher la migration via un endpoint API sécurisé !**

---

## 📋 Étapes (5 minutes)

### Étape 1 : Configurer le Token Admin

1. Allez dans votre **Backend** sur Render
2. Cliquez sur **"Environment"**
3. Cliquez sur **"Add Environment Variable"**
4. Ajoutez :
   - **Key** : `ADMIN_MIGRATION_TOKEN`
   - **Value** : `votre-token-secret-tres-long-et-securise-123456789`
   - ⚠️ **Important** : Choisissez un mot de passe fort et unique !

5. Le backend redéploiera automatiquement

### Étape 2 : Déclencher la Migration

**Option A : Depuis le navigateur (Console JavaScript)**

Ouvrez la console de votre navigateur (F12) et tapez :

```javascript
fetch('https://votre-backend.onrender.com/api/admin/migrate-cloudinary', {
  method: 'POST',
  headers: {
    'x-admin-token': 'votre-token-secret-tres-long-et-securise-123456789'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Option B : Avec cURL (Terminal)**

```bash
curl -X POST https://votre-backend.onrender.com/api/admin/migrate-cloudinary \
  -H "x-admin-token: votre-token-secret-tres-long-et-securise-123456789"
```

**Option C : Avec Postman**

1. Méthode : `POST`
2. URL : `https://votre-backend.onrender.com/api/admin/migrate-cloudinary`
3. Headers :
   - Key : `x-admin-token`
   - Value : `votre-token-secret-tres-long-et-securise-123456789`
4. Cliquez sur "Send"

### Étape 3 : Suivre la Progression

1. Allez dans Render → **Backend** → **Logs**
2. Cherchez les lignes qui commencent par `[Migration]`
3. Vous verrez :
   ```
   [Migration] ========================================
   [Migration] Starting Supabase → Cloudinary migration
   [Migration] ========================================
   [Migration] Listing files from Supabase...
   [Migration] Found 150 files to migrate
   [Migration] [1/150] Processing: deleted-messages/userId/file.jpg
   [Migration] ✅ Migrated: deleted-messages/userId/file.jpg -> https://res.cloudinary.com/...
   ...
   [Migration] ✅ Migration Complete!
   [Migration] Success: 148
   [Migration] Failed: 2
   ```

---

## ✅ Réponse de l'API

Si tout va bien, vous recevrez :

```json
{
  "success": true,
  "message": "Migration started. Check logs for progress.",
  "data": {
    "status": "started",
    "note": "Migration is running in background. Check server logs for progress."
  }
}
```

La migration s'exécute en arrière-plan, vous pouvez fermer la requête.

---

## 🔍 Vérification

### Vérifier que la Migration a Fonctionné

1. **Dans Cloudinary Dashboard** :
   - Allez sur [cloudinary.com](https://cloudinary.com) → Dashboard
   - Cliquez sur **"Media Library"**
   - Vous devriez voir vos dossiers : `deleted-messages/`, `view-once/`, etc.

2. **Dans les Logs Render** :
   - Cherchez `[Migration] ✅ Migration Complete!`
   - Vérifiez le nombre de fichiers migrés

3. **Tester un Nouveau Upload** :
   - Envoyez un nouveau média
   - Vérifiez que l'URL commence par `https://res.cloudinary.com`

---

## 🚨 Dépannage

### Erreur 401 : "Unauthorized"

**Cause** : Token incorrect ou manquant

**Solution** :
- Vérifiez que `ADMIN_MIGRATION_TOKEN` est bien défini dans Render
- Vérifiez que vous utilisez le même token dans la requête
- Le token est sensible à la casse

### Erreur 400 : "Cloudinary not configured"

**Cause** : Variables Cloudinary manquantes

**Solution** :
- Vérifiez que `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` sont définis
- Redéployez le backend

### Migration ne démarre pas

**Solution** :
- Vérifiez les logs Render pour voir les erreurs
- Vérifiez que Supabase Storage est configuré (`SUPABASE_STORAGE_BUCKET`)
- Vérifiez que vous avez des fichiers à migrer

### Migration lente

**Normal** : La migration peut prendre du temps selon le nombre de fichiers
- ~200ms par fichier (pour éviter le rate limiting)
- 100 fichiers = ~20 secondes
- 1000 fichiers = ~3-4 minutes

---

## 🔒 Sécurité

### Après la Migration

**Recommandation** : Supprimez le token admin après la migration

1. Render → Backend → Environment
2. Supprimez `ADMIN_MIGRATION_TOKEN`
3. Redéployez

**OU** gardez-le pour de futures migrations, mais utilisez un token fort.

---

## 📊 Statistiques

L'endpoint retourne aussi le statut :

```bash
GET https://votre-backend.onrender.com/api/admin/migration-status \
  -H "x-admin-token: votre-token"
```

**Note** : Pour l'instant, le statut est dans les logs. Une version future pourrait stocker le statut dans Redis.

---

## ✅ Checklist

- [ ] Token admin configuré dans Render
- [ ] Backend redéployé
- [ ] Migration déclenchée via l'endpoint
- [ ] Logs vérifiés dans Render
- [ ] Fichiers vérifiés dans Cloudinary Dashboard
- [ ] Test d'un nouveau upload effectué
- [ ] Token admin supprimé (optionnel, pour sécurité)

---

**C'est tout !** La migration s'exécute automatiquement sur Render via l'endpoint admin. 🎉

