# 🧪 Guide de Test - AMDA Backend

## 📋 Prérequis

1. **Supabase** configuré avec le schéma appliqué
2. **Redis** en cours d'exécution (optionnel pour les tests de base)
3. **Variables d'environnement** configurées dans `.env`

## 🚀 Démarrage du Serveur

```bash
cd backend
npm install
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:8000` (ou le PORT configuré).

## ✅ Tests à Effectuer

### 1. Test de Santé (Health Check)

```bash
curl http://localhost:8000/health
```

**Résultat attendu :**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "environment": "development"
}
```

### 2. Test d'Inscription (Register)

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "plan": "free"
    },
    "token": "jwt-token-here"
  },
  "message": "User registered successfully"
}
```

**Erreurs possibles :**
- `400` : Email invalide ou mot de passe trop court
- `409` : Email déjà utilisé

### 3. Test de Connexion (Login)

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "plan": "free"
    },
    "token": "jwt-token-here"
  },
  "message": "Login successful"
}
```

**Erreurs possibles :**
- `401` : Email ou mot de passe incorrect

### 4. Test Get Current User (Me)

```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "plan": "free",
    "subscription_id": null,
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Erreurs possibles :**
- `401` : Token manquant ou invalide

### 5. Test de Connexion WhatsApp (Get QR Code)

```bash
curl -X GET http://localhost:8000/api/whatsapp/qr \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "sessionId": "session_userId_timestamp"
  }
}
```

**Note :** Le QR code est une image base64. Vous pouvez l'afficher dans le frontend.

### 6. Test du Statut WhatsApp

```bash
curl -X GET http://localhost:8000/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "status": "connecting",
    "qrCode": "data:image/png;base64,...",
    "connectedAt": null,
    "lastSeen": null
  }
}
```

**Statuts possibles :**
- `disconnected` : Non connecté
- `connecting` : En attente de scan QR
- `connected` : Connecté et prêt

### 7. Test de Déconnexion WhatsApp

```bash
curl -X POST http://localhost:8000/api/whatsapp/disconnect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "WhatsApp disconnected successfully"
}
```

## 🧪 Tests avec Postman/Thunder Client

### Collection Postman

1. **Health Check**
   - GET `http://localhost:8000/health`

2. **Register**
   - POST `http://localhost:8000/api/auth/register`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "Test1234"
     }
     ```

3. **Login**
   - POST `http://localhost:8000/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "Test1234"
     }
     ```

4. **Get Me**
   - GET `http://localhost:8000/api/auth/me`
   - Headers: `Authorization: Bearer {token}`

5. **Get QR Code**
   - GET `http://localhost:8000/api/whatsapp/qr`
   - Headers: `Authorization: Bearer {token}`

6. **Get Status**
   - GET `http://localhost:8000/api/whatsapp/status`
   - Headers: `Authorization: Bearer {token}`

7. **Disconnect**
   - POST `http://localhost:8000/api/whatsapp/disconnect`
   - Headers: `Authorization: Bearer {token}`

## 🐛 Dépannage

### Erreur : "Missing required environment variable"
- Vérifiez que le fichier `.env` existe et contient toutes les variables nécessaires
- Consultez `env.template` pour la liste complète

### Erreur : "Redis Client Error"
- Vérifiez que Redis est en cours d'exécution
- Testez : `redis-cli ping` (devrait retourner `PONG`)

### Erreur : "Failed to connect to Supabase"
- Vérifiez vos credentials Supabase dans `.env`
- Vérifiez que le schéma SQL a été appliqué

### Erreur : "Invalid token"
- Vérifiez que le token JWT est correct
- Le token expire après `JWT_EXPIRES_IN` (par défaut 7d)
- Reconnectez-vous pour obtenir un nouveau token

## 📝 Notes Importantes

1. **QR Code WhatsApp** : Le QR code expire après ~20 secondes. Si nécessaire, faites une nouvelle requête `/qr`
2. **Sessions WhatsApp** : Les sessions sont stockées dans `./sessions/{userId}/`
3. **Rate Limiting** : Les routes `/register` et `/login` sont limitées à 100 requêtes / 15 minutes par IP

