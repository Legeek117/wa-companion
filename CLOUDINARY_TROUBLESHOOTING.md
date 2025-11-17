# 🔧 Dépannage Cloudinary - Guide

## 🚨 Problème : Erreurs d'Upload vers Cloudinary

Si vous voyez des erreurs `[CloudinaryStorage] Upload error:` lors de la migration, voici comment diagnostiquer :

---

## 📋 Vérifications de Base

### 1. Vérifier la Configuration

Assurez-vous que ces 3 variables sont bien définies dans votre `.env` :

```env
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret
```

### 2. Vérifier les Credentials

1. Allez sur [cloudinary.com](https://cloudinary.com) → Dashboard
2. Vérifiez que :
   - Le **Cloud name** correspond à `CLOUDINARY_CLOUD_NAME`
   - L'**API Key** correspond à `CLOUDINARY_API_KEY`
   - L'**API Secret** correspond à `CLOUDINARY_API_SECRET`

### 3. Tester la Connexion

Créez un fichier de test `backend/scripts/test-cloudinary.ts` :

```typescript
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Test simple upload
cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 
  { folder: 'test' },
  (error, result) => {
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Success:', result?.secure_url);
    }
    process.exit(error ? 1 : 0);
  }
);
```

Exécutez :
```bash
ts-node scripts/test-cloudinary.ts
```

---

## 🔍 Erreurs Courantes

### Erreur : "Invalid API Key" ou "401 Unauthorized"

**Cause** : Credentials incorrects

**Solution** :
1. Vérifiez que les 3 variables sont correctes
2. Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs
3. Régénérez les credentials dans Cloudinary Dashboard si nécessaire

### Erreur : "Rate limit exceeded" ou "429"

**Cause** : Trop de requêtes

**Solution** :
- Attendez quelques minutes
- Réduisez le délai entre les uploads dans le script de migration
- Passez à un plan payant Cloudinary si nécessaire

### Erreur : "Invalid public_id" ou "Invalid folder"

**Cause** : Caractères invalides dans le nom

**Solution** :
- Les noms de fichiers avec caractères spéciaux peuvent causer des problèmes
- Cloudinary accepte : lettres, chiffres, `-`, `_`, `/`
- Évitez : espaces, caractères spéciaux

### Erreur : "File too large"

**Cause** : Fichier dépasse la limite

**Solution** :
- Plan gratuit : 10MB par fichier
- Vérifiez la taille des fichiers avant upload
- Compressez les fichiers volumineux

---

## 🛠️ Améliorations Apportées

J'ai amélioré le logging pour afficher :
- ✅ Message d'erreur exact
- ✅ Code HTTP
- ✅ Paramètres utilisés (folder, publicId, etc.)
- ✅ Détails complets de l'erreur

**Relancez la migration** et vous verrez maintenant les détails exacts de l'erreur !

---

## 💡 Solution Alternative : Utiliser l'API Upload Directe

Si le problème persiste, on peut utiliser l'API REST directe au lieu du SDK :

```typescript
// Alternative: API REST directe
const formData = new FormData();
formData.append('file', buffer);
formData.append('folder', folder);
formData.append('public_id', publicId);
// etc.
```

Mais d'abord, vérifions les logs améliorés pour voir l'erreur exacte.

---

**Relancez la migration et partagez les nouveaux logs d'erreur pour qu'on puisse identifier le problème exact !**

