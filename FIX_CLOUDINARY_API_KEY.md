# 🔧 Correction : Invalid API Key Cloudinary

## 🚨 Problème Identifié

L'erreur est claire :
```
Invalid api_key your-api-key
http_code: 401
```

**Votre `.env` contient encore la valeur placeholder `your-api-key` au lieu de votre vraie clé API Cloudinary !**

---

## ✅ Solution

### Étape 1 : Récupérer vos Vraies Clés Cloudinary

1. Allez sur [cloudinary.com](https://cloudinary.com)
2. Connectez-vous à votre compte
3. Allez dans le **Dashboard**
4. En haut de la page, vous verrez vos credentials :
   - **Cloud name** : `dxxxxx` (exemple)
   - **API Key** : `123456789012345` (exemple)
   - **API Secret** : `abcdefghijklmnopqrstuvwxyz123456` (exemple)

### Étape 2 : Mettre à Jour votre `.env`

Ouvrez `backend/.env` et remplacez :

```env
# ❌ AVANT (placeholder)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ✅ APRÈS (vos vraies valeurs)
CLOUDINARY_CLOUD_NAME=dxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

**Important** :
- Remplacez `dxxxxx` par votre vrai Cloud name
- Remplacez `123456789012345` par votre vraie API Key
- Remplacez `abcdefghijklmnopqrstuvwxyz123456` par votre vraie API Secret

### Étape 3 : Pour Render (Production)

Si vous êtes sur Render, ajoutez aussi ces variables :

1. Render → Backend → Environment
2. Ajoutez/modifiez :
   - `CLOUDINARY_CLOUD_NAME` = votre-cloud-name
   - `CLOUDINARY_API_KEY` = votre-api-key
   - `CLOUDINARY_API_SECRET` = votre-api-secret

3. Redéployez le backend

---

## 🧪 Tester la Configuration

Après avoir mis à jour le `.env`, testez :

```bash
cd backend
npm run migrate-cloudinary
```

Vous devriez maintenant voir :
```
[CloudinaryStorage] Media uploaded: ... -> https://res.cloudinary.com/...
```

Au lieu de :
```
Invalid api_key your-api-key
```

---

## ⚠️ Sécurité

- ✅ Ne partagez jamais vos credentials Cloudinary
- ✅ Ne commitez jamais votre `.env` dans Git
- ✅ Utilisez des variables d'environnement en production

---

**Une fois les vraies clés configurées, relancez la migration !** 🚀

