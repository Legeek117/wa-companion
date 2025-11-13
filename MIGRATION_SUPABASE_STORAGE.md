# 📦 Migration vers Supabase Storage

## ✅ Modifications effectuées

### 1. Nouveau service Supabase Storage
- **Fichier** : `backend/src/services/supabaseStorage.service.ts`
- **Fonctions** :
  - `uploadMediaToSupabase()` - Upload vers Supabase Storage
  - `downloadMediaFromSupabase()` - Téléchargement depuis Supabase Storage
  - `deleteMediaFromSupabase()` - Suppression depuis Supabase Storage
  - `getMediaPublicUrl()` - Obtenir l'URL publique
  - `listMediaFiles()` - Lister les fichiers

### 2. Service Media mis à jour
- **Fichier** : `backend/src/services/media.service.ts`
- **Changements** :
  - `uploadMedia()` utilise maintenant Supabase Storage en priorité
  - Fallback vers stockage local si Supabase n'est pas disponible
  - Support des sous-dossiers : `deleted-messages`, `view-once`, `scheduled-status`
  - Organisation par utilisateur : `{subdirectory}/{userId}/{filename}`

### 3. Service View Once mis à jour
- **Fichier** : `backend/src/services/viewOnce.service.ts`
- **Changements** :
  - Utilise `uploadMedia()` qui gère Supabase Storage automatiquement
  - Plus de sauvegarde locale directe
  - URLs publiques Supabase pour les médias

### 4. Service Deleted Messages mis à jour
- **Fichier** : `backend/src/services/deletedMessages.service.ts`
- **Changements** :
  - Utilise `processAndUploadMedia()` avec le paramètre `subdirectory`
  - Médias stockés dans `deleted-messages/{userId}/`

### 5. Commande View Once simplifiée
- **Fichier** : `backend/src/services/autoresponder.service.ts`
- **Changements** :
  - ✅ Commande `.vv` uniquement (suppression de `.viewonce` et emoji 👀)
  - ✅ Support de `.vv` et `!vv`

### 6. Configuration PWA corrigée
- **Fichier** : `vite.config.ts`
- **Changements** :
  - Ajout de `injectRegister: "auto"`
  - Ajout de `strategies: "generateSW"`
  - Ajout de `filename: "sw.js"`
  - Configuration workbox pour le cache

### 7. Configuration Netlify
- **Fichier** : `netlify.toml`
- **Changements** :
  - Headers pour `/sw.js` (Service Worker)
  - Headers pour `/workbox-*.js` (Workbox)
  - Headers pour `/manifest.json`

### 8. Configuration Render
- **Fichier** : `backend/render.yaml`
- **Changements** :
  - Ajout de `SUPABASE_STORAGE_BUCKET` dans les variables d'environnement

### 9. Template d'environnement
- **Fichier** : `backend/env.template`
- **Changements** :
  - Ajout de `SUPABASE_STORAGE_BUCKET=amda-media`

---

## 🔧 Configuration requise

### 1. Créer le bucket Supabase Storage

Dans votre projet Supabase :

1. Allez dans **Storage**
2. Cliquez sur **New bucket**
3. Nom : `amda-media`
4. **Public bucket** : ✅ Activé
5. Cliquez sur **Create bucket**

### 2. Configurer les politiques RLS

Dans Supabase → **Storage** → **Policies** pour `amda-media` :

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

### 3. Variable d'environnement

Ajoutez dans votre `.env` (backend) :

```env
SUPABASE_STORAGE_BUCKET=amda-media
```

---

## 📁 Structure de stockage

Les médias sont organisés comme suit dans Supabase Storage :

```
amda-media/
├── deleted-messages/
│   └── {userId}/
│       └── {filename}
├── view-once/
│   └── {userId}/
│       └── {filename}
└── scheduled-status/
    └── {userId}/
        └── {filename}
```

---

## 🔄 Migration des données existantes

Si vous avez déjà des médias stockés localement, vous pouvez les migrer :

### Script de migration (optionnel)

```typescript
// scripts/migrate-media-to-supabase.ts
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { uploadMediaToSupabase } from '../src/services/supabaseStorage.service';

async function migrateMedia() {
  const uploadsDir = join(process.cwd(), 'uploads');
  
  // Migrer deleted-messages
  const deletedDir = join(uploadsDir, 'deleted-messages');
  const deletedFiles = await readdir(deletedDir);
  
  for (const file of deletedFiles) {
    const filePath = join(deletedDir, file);
    const buffer = await readFile(filePath);
    const userId = file.split('_')[0]; // Extraire userId du nom de fichier
    
    await uploadMediaToSupabase(
      buffer,
      `deleted-messages/${userId}/${file}`,
      'application/octet-stream'
    );
    
    console.log(`Migrated: ${file}`);
  }
  
  // Répéter pour view-once et scheduled-status
}
```

---

## ✅ Avantages de Supabase Storage

1. **Persistance** : Les médias ne sont pas perdus lors des redémarrages
2. **CDN** : Distribution globale via le CDN Supabase
3. **Scalabilité** : Pas de limite de taille de disque
4. **Sécurité** : Politiques RLS pour contrôler l'accès
5. **URLs publiques** : Accès direct aux médias sans serveur

---

## 🐛 Dépannage

### Les médias ne s'affichent pas

1. Vérifiez que le bucket `amda-media` existe
2. Vérifiez que le bucket est public
3. Vérifiez les politiques RLS
4. Vérifiez que `SUPABASE_STORAGE_BUCKET` est défini
5. Vérifiez les logs backend pour les erreurs d'upload

### Erreur "Storage not enabled"

- Vérifiez que `SUPABASE_STORAGE_BUCKET` est défini dans `.env`
- Le système basculera automatiquement vers le stockage local en fallback

### URLs Supabase ne fonctionnent pas

- Vérifiez que le bucket est public
- Vérifiez les politiques RLS
- Testez l'URL directement dans le navigateur

---

## 📝 Notes

- Le système utilise Supabase Storage en priorité
- Si Supabase Storage n'est pas disponible, il bascule automatiquement vers le stockage local
- Les URLs Supabase sont publiques et accessibles directement
- Les médias sont organisés par utilisateur pour faciliter la gestion

