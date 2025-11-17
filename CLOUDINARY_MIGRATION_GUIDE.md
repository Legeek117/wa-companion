# ☁️ Migration vers Cloudinary - Guide Complet

## 📋 Vue d'Ensemble

### Structure Actuelle (Supabase)
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

### Structure Cloudinary (Identique)
```
deleted-messages/
└── {userId}/
    └── {filename}
view-once/
└── {userId}/
    └── {filename}
scheduled-status/
└── {userId}/
    └── {filename}
```

**✅ La structure est identique !** Les fichiers seront organisés exactement de la même manière.

---

## 🚀 Configuration Cloudinary

### Étape 1 : Créer un Compte Cloudinary

1. Allez sur [cloudinary.com](https://cloudinary.com)
2. Cliquez sur **"Sign Up for Free"**
3. Créez un compte (25GB gratuits)
4. Confirmez votre email

### Étape 2 : Récupérer les Clés API

1. Une fois connecté, allez dans le **Dashboard**
2. Vous verrez vos credentials en haut de la page :
   - **Cloud name** : `dxxxxx` (votre nom de cloud)
   - **API Key** : `123456789012345`
   - **API Secret** : `abcdefghijklmnopqrstuvwxyz123456`

3. **Copiez ces 3 valeurs**

### Étape 3 : Configurer dans Render

1. Allez dans votre **Backend** sur Render
2. Cliquez sur **"Environment"**
3. Ajoutez ces 3 variables :

```env
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret
```

4. **Redéployez** le backend (automatique)

---

## 🔄 Migration Automatique

### ✅ Nouveaux Fichiers (Automatique)

**Dès que vous configurez Cloudinary, tous les nouveaux uploads iront automatiquement vers Cloudinary !**

- ✅ **Deleted Messages** → Cloudinary
- ✅ **View Once** → Cloudinary
- ✅ **Scheduled Status** → Cloudinary
- ✅ **Status Media** → Cloudinary

**Aucune action requise** - Le code gère automatiquement la priorité :
1. Cloudinary (si configuré)
2. Supabase (fallback)
3. Local (dernier recours)

### 📁 Organisation Identique

Les fichiers sont organisés **exactement comme dans Supabase** :

```
Cloudinary:
deleted-messages/
  └── userId-123/
      └── file_1234567890_abc123.jpg

Supabase (ancien):
amda-media/
  └── deleted-messages/
      └── userId-123/
          └── file_1234567890_abc123.jpg
```

**Note** : Cloudinary n'a pas besoin du préfixe `amda-media/` car c'est votre cloud entier.

---

## 🔄 Migration des Fichiers Existants (Optionnel)

Si vous voulez migrer les fichiers existants de Supabase vers Cloudinary, voici un script :

### Script de Migration

Créez `backend/scripts/migrate-supabase-to-cloudinary.ts` :

```typescript
import { getSupabaseClient } from '../src/config/database';
import { downloadMediaFromSupabase } from '../src/services/supabaseStorage.service';
import { uploadMediaToCloudinary } from '../src/services/cloudinaryStorage.service';
import { logger } from '../src/config/logger';
import { env } from '../src/config/env';

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET?.trim();
const supabase = getSupabaseClient();

interface FileInfo {
  path: string;
  userId: string;
  subdirectory: string;
  filename: string;
}

async function listAllSupabaseFiles(): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  const subdirectories = ['deleted-messages', 'view-once', 'scheduled-status'];

  for (const subdirectory of subdirectories) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET as string)
      .list(subdirectory, { limit: 1000 });

    if (error) {
      logger.warn(`[Migration] Error listing ${subdirectory}:`, error);
      continue;
    }

    if (!data) continue;

    for (const item of data) {
      // Check if it's a user folder
      if (item.id === null) {
        // It's a folder (userId)
        const userId = item.name;
        const { data: userFiles } = await supabase.storage
          .from(STORAGE_BUCKET as string)
          .list(`${subdirectory}/${userId}`, { limit: 1000 });

        if (userFiles) {
          for (const file of userFiles) {
            if (file.id !== null) {
              files.push({
                path: `${subdirectory}/${userId}/${file.name}`,
                userId,
                subdirectory,
                filename: file.name,
              });
            }
          }
        }
      }
    }
  }

  return files;
}

async function migrateFile(file: FileInfo): Promise<boolean> {
  try {
    logger.info(`[Migration] Migrating: ${file.path}`);

    // Download from Supabase
    const buffer = await downloadMediaFromSupabase(file.path);
    if (!buffer) {
      logger.warn(`[Migration] Failed to download: ${file.path}`);
      return false;
    }

    // Determine content type from filename
    const ext = file.filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'mp4') contentType = 'video/mp4';
    else if (ext === 'webp') contentType = 'image/webp';

    // Upload to Cloudinary
    const cloudinaryUrl = await uploadMediaToCloudinary(
      buffer,
      file.path,
      contentType,
      { folder: file.subdirectory }
    );

    if (cloudinaryUrl) {
      logger.info(`[Migration] ✅ Migrated: ${file.path} -> ${cloudinaryUrl}`);
      return true;
    } else {
      logger.warn(`[Migration] ❌ Failed to upload to Cloudinary: ${file.path}`);
      return false;
    }
  } catch (error) {
    logger.error(`[Migration] Error migrating ${file.path}:`, error);
    return false;
  }
}

async function main() {
  logger.info('[Migration] Starting Supabase → Cloudinary migration...');

  // Check Cloudinary config
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.error('[Migration] Cloudinary not configured! Please set CLOUDINARY_* variables.');
    process.exit(1);
  }

  // List all files
  logger.info('[Migration] Listing all files from Supabase...');
  const files = await listAllSupabaseFiles();
  logger.info(`[Migration] Found ${files.length} files to migrate`);

  if (files.length === 0) {
    logger.info('[Migration] No files to migrate');
    process.exit(0);
  }

  // Migrate files
  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const success = await migrateFile(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  logger.info(`[Migration] ✅ Complete! Success: ${successCount}, Failed: ${failCount}`);
  process.exit(0);
}

main().catch(error => {
  logger.error('[Migration] Fatal error:', error);
  process.exit(1);
});
```

### Option A : Via Endpoint Admin (Recommandé pour Render) ⭐

**La méthode la plus simple sur Render !**

1. **Ajoutez un token secret dans Render** :
   - Backend → Environment → Add Variable
   - Key : `ADMIN_MIGRATION_TOKEN`
   - Value : `votre-token-secret-tres-long-et-securise`

2. **Déclenchez la migration** :
   ```bash
   curl -X POST https://votre-backend.onrender.com/api/admin/migrate-cloudinary \
     -H "x-admin-token: votre-token-secret-tres-long-et-securise"
   ```

3. **Suivez les logs** :
   - Render → Backend → Logs
   - Cherchez les lignes `[Migration]`

**Avantages** :
- ✅ Pas besoin d'accès SSH
- ✅ Simple depuis le navigateur ou Postman
- ✅ Logs visibles dans Render

### Option B : Script Local

```bash
cd backend
npm run build
node dist/scripts/migrate-supabase-to-cloudinary.js
```

**Note** : Ce script est optionnel. Les nouveaux fichiers iront automatiquement vers Cloudinary.

---

## 📊 Comparaison Supabase vs Cloudinary

| Fonctionnalité | Supabase | Cloudinary |
|----------------|----------|------------|
| **Espace gratuit** | 1GB | 25GB |
| **CDN** | ❌ | ✅ Intégré |
| **Transformations** | ❌ | ✅ (redimensionnement, compression) |
| **Organisation** | Dossiers | Dossiers (folders) |
| **URLs publiques** | ✅ | ✅ |
| **Structure** | `bucket/sub/user/file` | `folder/user/file` |

---

## ✅ Checklist de Migration

### Configuration
- [ ] Compte Cloudinary créé
- [ ] 3 variables d'environnement ajoutées dans Render
- [ ] Backend redéployé
- [ ] Logs vérifiés : "Cloudinary configured"

### Test
- [ ] Upload d'un nouveau média testé
- [ ] Vérifier que l'URL est Cloudinary (commence par `https://res.cloudinary.com`)
- [ ] Vérifier que le fichier est accessible

### Migration (Optionnel)
- [ ] Script de migration créé
- [ ] Fichiers existants migrés (si nécessaire)
- [ ] Vérifier que les anciens fichiers fonctionnent toujours

---

## 🎯 Résultat Attendu

### Avant (Supabase)
```
URL: https://xxxxx.supabase.co/storage/v1/object/public/amda-media/deleted-messages/userId/file.jpg
```

### Après (Cloudinary)
```
URL: https://res.cloudinary.com/votre-cloud/image/upload/deleted-messages/userId/file.jpg
```

**Les deux fonctionnent !** Le code gère automatiquement les deux formats.

---

## 🔍 Vérification

### Vérifier que Cloudinary fonctionne

1. **Regardez les logs du backend** :
   ```
   [CloudinaryStorage] Cloudinary configured
   [Media] Media uploaded to Cloudinary: https://res.cloudinary.com/...
   ```

2. **Testez un upload** :
   - Envoyez un message avec média
   - Vérifiez l'URL retournée
   - Elle devrait commencer par `https://res.cloudinary.com`

3. **Vérifiez dans Cloudinary Dashboard** :
   - Allez dans **Media Library**
   - Vous devriez voir vos dossiers : `deleted-messages/`, `view-once/`, etc.

---

## 🚨 Dépannage

### Erreur : "Cloudinary not configured"

**Solution** : Vérifiez que les 3 variables sont bien définies dans Render.

### Erreur : "Upload failed"

**Solution** : 
- Vérifiez les credentials Cloudinary
- Vérifiez que votre compte n'a pas dépassé la limite (25GB)

### Les fichiers vont toujours vers Supabase

**Solution** : 
- Vérifiez les logs : "Cloudinary not available" ?
- Vérifiez que Cloudinary est bien configuré
- Le fallback vers Supabase est normal si Cloudinary échoue

---

## 💡 Avantages de Cloudinary

1. **25GB gratuits** vs 1GB Supabase
2. **CDN intégré** : Fichiers servis plus rapidement
3. **Transformations automatiques** : Redimensionnement, compression
4. **Meilleure organisation** : Interface de gestion des médias
5. **Analytics** : Statistiques d'utilisation

---

**Questions ?** N'hésitez pas à demander de l'aide !

