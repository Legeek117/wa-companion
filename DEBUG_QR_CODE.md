# 🔍 Guide de Débogage - QR Code WhatsApp

## ⚠️ Problème : Le QR code ne s'affiche pas

Si le QR code ne s'affiche pas après avoir cliqué sur "Générer QR Code", suivez ces étapes de diagnostic.

## 🔧 Étapes de Diagnostic

### 1. Vérifier que vous êtes connecté

**Étape 1** : Ouvrez la console du navigateur (F12)

**Étape 2** : Exécutez :
```javascript
localStorage.getItem('auth_token')
```

**Résultat attendu** : Un token JWT (longue chaîne de caractères)

**Si `null`** : Allez sur `/auth` et connectez-vous d'abord

### 2. Vérifier les logs du serveur backend

**Étape 1** : Regardez les logs du serveur backend dans le terminal

**Étape 2** : Cherchez ces messages :
- `[WhatsApp] QR Code request for user...`
- `[WhatsApp] Generating QR code for user...`
- `[WhatsApp] QR code generated and saved...`

**Si vous voyez des erreurs** : Notez-les et vérifiez les solutions ci-dessous

### 3. Vérifier les logs du navigateur

**Étape 1** : Ouvrez la console du navigateur (F12)

**Étape 2** : Cliquez sur "Générer QR Code"

**Étape 3** : Cherchez ces messages :
- `[WhatsApp] Requesting QR code...`
- `[WhatsApp] QR code response:`
- `[WhatsApp] QR code mutation success:`

**Si vous voyez des erreurs** : Notez-les

### 4. Vérifier la réponse de l'API

**Étape 1** : Ouvrez l'onglet **"Network"** (Réseau) dans la console

**Étape 2** : Cliquez sur "Générer QR Code"

**Étape 3** : Cliquez sur la requête `/api/whatsapp/qr`

**Étape 4** : Allez dans l'onglet **"Response"**

**Vérifiez** : La réponse devrait contenir :
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "sessionId": "..."
  }
}
```

**Si `qrCode` est vide** : Le QR code n'a pas été généré côté backend

### 5. Vérifier que le serveur backend fonctionne

**Étape 1** : Vérifiez que le serveur backend est démarré :
```bash
cd backend
npm run dev
```

**Étape 2** : Testez l'endpoint de santé :
```bash
curl http://localhost:3000/health
```

**Résultat attendu** :
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development"
}
```

### 6. Vérifier les dépendances

**Étape 1** : Vérifiez que le package `qrcode` est installé :
```bash
cd backend
npm list qrcode
```

**Si le package n'est pas installé** :
```bash
npm install qrcode
```

### 7. Vérifier les variables d'environnement

**Étape 1** : Vérifiez que le fichier `.env` existe dans `backend/`

**Étape 2** : Vérifiez que ces variables sont définies :
- `JWT_SECRET` (obligatoire)
- `JWT_REFRESH_SECRET` (obligatoire)
- `SUPABASE_URL` (obligatoire)
- `SUPABASE_ANON_KEY` (obligatoire)
- `SUPABASE_SERVICE_ROLE_KEY` (obligatoire)

## 🐛 Problèmes Courants

### Problème 1 : Le QR code n'est pas généré

**Symptômes** :
- La réponse API contient `qrCode: ""`
- Les logs montrent "Still waiting for QR code..."

**Causes possibles** :
1. Le socket WhatsApp ne génère pas de QR code
2. Le timeout est trop court
3. Erreur lors de la génération du QR code

**Solutions** :
1. Vérifiez les logs du serveur pour voir les erreurs
2. Augmentez le timeout dans `whatsapp.service.ts`
3. Vérifiez que le package `qrcode` est correctement installé

### Problème 2 : Le QR code est généré mais ne s'affiche pas

**Symptômes** :
- La réponse API contient un `qrCode` valide
- Le QR code ne s'affiche pas dans l'interface

**Causes possibles** :
1. Le format du QR code n'est pas correct
2. L'image ne charge pas
3. Le cache React Query n'est pas mis à jour

**Solutions** :
1. Vérifiez que le QR code commence par `data:image/png;base64,`
2. Vérifiez la console du navigateur pour les erreurs d'image
3. Vérifiez que le cache React Query est mis à jour

### Problème 3 : Erreur 401 (Unauthorized)

**Symptômes** :
- Erreur 401 lors de la requête `/api/whatsapp/qr`
- "No token provided"

**Solutions** :
1. Vérifiez que vous êtes connecté
2. Vérifiez que le token est dans localStorage
3. Reconnectez-vous si nécessaire

## ✅ Checklist

- [ ] Serveur backend démarré sur `http://localhost:3000`
- [ ] Vous êtes connecté (token dans localStorage)
- [ ] Le package `qrcode` est installé
- [ ] Les variables d'environnement sont définies
- [ ] Les logs du serveur montrent la génération du QR code
- [ ] La réponse API contient un `qrCode` valide
- [ ] Le QR code commence par `data:image/png;base64,`
- [ ] Pas d'erreurs dans la console du navigateur

## 🎯 Test Manuel

1. **Ouvrez la console du navigateur** (F12)
2. **Allez sur** `/dashboard/settings` → onglet "WhatsApp"
3. **Cliquez sur** "Générer QR Code"
4. **Regardez les logs** dans la console :
   - `[WhatsApp] Requesting QR code...`
   - `[WhatsApp] QR code response:`
   - `[WhatsApp] QR code mutation success:`
5. **Regardez les logs du serveur** :
   - `[WhatsApp] QR Code request for user...`
   - `[WhatsApp] Generating QR code for user...`
   - `[WhatsApp] QR code generated and saved...`

## 📝 Notes

- Le QR code peut prendre 2-5 secondes à générer
- Le polling automatique vérifie le statut toutes les 2 secondes
- Le QR code est stocké dans la base de données et en mémoire
- Si le QR code n'apparaît pas après 30 secondes, réessayez








