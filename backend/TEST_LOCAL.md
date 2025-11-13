# 🧪 Tests Locaux - AMDA Backend

## 🚀 Serveur Démarré

- **Backend** : `http://localhost:3000` ✅
- **Frontend** : `http://localhost:8081` ✅

## 📋 Tests à Effectuer

### 1. Test de Base

#### Route Racine
```bash
curl http://localhost:3000/
```

#### Health Check
```bash
curl http://localhost:3000/health
```

### 2. Test d'Inscription

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234\"}"
```

**Résultat attendu** :
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

### 3. Test de Connexion

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234\"}"
```

**Copiez le token JWT de la réponse !**

### 4. Test Get Me (avec token)

Remplacez `VOTRE_TOKEN` par le token obtenu lors du login :

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### 5. Test WhatsApp QR Code (avec token)

```bash
curl -X GET http://localhost:3000/api/whatsapp/qr \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

**Résultat attendu** :
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "sessionId": "session_userId_timestamp"
  }
}
```

### 6. Test WhatsApp Status (avec token)

```bash
curl -X GET http://localhost:3000/api/whatsapp/status \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

## 🔧 Configuration Frontend

Pour connecter votre frontend au backend, mettez à jour votre `.env` frontend :

```env
VITE_API_URL=http://localhost:3000
```

## ⚠️ Notes

### CORS
Si vous avez des erreurs CORS, vérifiez que `FRONTEND_URL` dans le `.env` backend correspond à votre port frontend :
- Si frontend sur `8081` : `FRONTEND_URL=http://localhost:8081`

### Token JWT
- Le token expire après `JWT_EXPIRES_IN` (par défaut 7d)
- Pour obtenir un nouveau token, reconnectez-vous

### Redis
- Les warnings Redis sont normaux
- Le serveur fonctionne sans Redis

## ✅ Checklist Tests

- [ ] Route `/` fonctionne
- [ ] Route `/health` fonctionne
- [ ] Inscription fonctionne
- [ ] Connexion fonctionne
- [ ] Get Me fonctionne (avec token)
- [ ] WhatsApp QR fonctionne (avec token)
- [ ] Frontend connecté au backend











