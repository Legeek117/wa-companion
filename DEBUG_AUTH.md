# 🔍 Guide de Débogage - Erreurs 401 (Unauthorized)

## ⚠️ Problème : Erreurs 401 sur les endpoints

Si vous voyez des erreurs `401 (Unauthorized)` pour les endpoints suivants :
- `/api/auth/me`
- `/api/whatsapp/status`
- `/api/whatsapp/qr`

Cela signifie que **le token JWT n'est pas envoyé ou est invalide**.

## 🔧 Solutions

### 1. Vérifier que vous êtes connecté

**Étape 1** : Allez sur `http://localhost:8081/auth`

**Étape 2** : 
- Si vous n'avez pas de compte, **inscrivez-vous** d'abord
- Si vous avez un compte, **connectez-vous**

**Étape 3** : Vérifiez que vous êtes redirigé vers `/dashboard` après la connexion

### 2. Vérifier le token dans localStorage

**Étape 1** : Ouvrez la console du navigateur (F12)

**Étape 2** : Allez dans l'onglet **"Console"**

**Étape 3** : Exécutez cette commande :
```javascript
localStorage.getItem('auth_token')
```

**Résultat attendu** : Vous devriez voir un token JWT (une longue chaîne de caractères)

**Si le résultat est `null`** : Vous n'êtes pas connecté, allez sur `/auth` et connectez-vous

### 3. Vérifier que le token est envoyé dans les requêtes

**Étape 1** : Ouvrez la console du navigateur (F12)

**Étape 2** : Allez dans l'onglet **"Network"** (Réseau)

**Étape 3** : Rechargez la page `/dashboard`

**Étape 4** : Cliquez sur une requête vers `/api/auth/me` ou `/api/whatsapp/status`

**Étape 5** : Allez dans l'onglet **"Headers"** → **"Request Headers"**

**Vérifiez** : Vous devriez voir :
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Si `Authorization` est absent** : Le token n'est pas envoyé

### 4. Vérifier que le serveur backend fonctionne

**Étape 1** : Vérifiez que le serveur backend est démarré

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

### 5. Vérifier les variables d'environnement

**Étape 1** : Vérifiez que le fichier `.env` existe dans `backend/`

**Étape 2** : Vérifiez que ces variables sont définies :
- `JWT_SECRET` (obligatoire)
- `JWT_REFRESH_SECRET` (obligatoire)
- `SUPABASE_URL` (obligatoire)
- `SUPABASE_ANON_KEY` (obligatoire)
- `SUPABASE_SERVICE_ROLE_KEY` (obligatoire)

### 6. Tester l'inscription et la connexion

**Test d'inscription** :
1. Allez sur `http://localhost:8081/auth`
2. Cliquez sur l'onglet **"Inscription"**
3. Remplissez :
   - Email : `test@example.com`
   - Mot de passe : `Test1234` (min 8 caractères, majuscule, minuscule, chiffre)
4. Cliquez sur **"Créer mon compte"**

**Résultat attendu** :
- ✅ Toast : "Compte créé avec succès ! Bienvenue 🎉"
- ✅ Redirection vers `/dashboard`
- ✅ Token stocké dans localStorage

**Test de connexion** :
1. Allez sur `http://localhost:8081/auth`
2. Cliquez sur l'onglet **"Connexion"**
3. Utilisez les mêmes identifiants
4. Cliquez sur **"Se connecter"**

**Résultat attendu** :
- ✅ Toast : "Connexion réussie !"
- ✅ Redirection vers `/dashboard`
- ✅ Token stocké dans localStorage

## 🐛 Diagnostic

### Si le token est dans localStorage mais les requêtes échouent

1. **Vérifiez que le token est valide** :
   - Le token pourrait être expiré
   - Le token pourrait être corrompu

2. **Solution** : Déconnectez-vous et reconnectez-vous

### Si le token n'est pas dans localStorage

1. **Vérifiez que l'inscription/connexion fonctionne** :
   - Regardez les logs du serveur backend
   - Vérifiez la console du navigateur pour les erreurs

2. **Solution** : Réessayez l'inscription ou la connexion

### Si le serveur backend ne répond pas

1. **Vérifiez que le serveur est démarré** :
   ```bash
   cd backend
   npm run dev
   ```

2. **Vérifiez les logs** pour voir les erreurs

## ✅ Checklist

- [ ] Serveur backend démarré sur `http://localhost:3000`
- [ ] Fichier `.env` créé dans `backend/` avec toutes les variables nécessaires
- [ ] Test d'inscription effectué
- [ ] Token présent dans localStorage (`localStorage.getItem('auth_token')`)
- [ ] Header `Authorization: Bearer <token>` présent dans les requêtes
- [ ] Pas d'erreurs dans la console du navigateur
- [ ] Pas d'erreurs dans les logs du serveur backend

## 🎯 Prochaines Étapes

Une fois que vous êtes connecté et que le token est stocké :
1. Les requêtes vers `/api/auth/me` devraient fonctionner
2. Les requêtes vers `/api/whatsapp/status` devraient fonctionner
3. Vous pourrez générer le QR code WhatsApp








