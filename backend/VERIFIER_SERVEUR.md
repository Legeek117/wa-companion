# ✅ Vérifier que le Serveur Backend Fonctionne

## 🚀 Le Serveur est Démarré

Le serveur backend devrait être en cours d'exécution sur `http://localhost:3000`

## 🧪 Tests Rapides

### 1. Test Health Check
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

### 2. Test Route Racine
```bash
curl http://localhost:3000/
```

**Résultat attendu** :
```json
{
  "message": "AMDA Backend API",
  "version": "1.0.0",
  "status": "ok",
  "endpoints": {
    "health": "/health",
    "api": "/api"
  }
}
```

### 3. Test API Login (sans token)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"test\"}"
```

**Résultat attendu** :
- Si l'utilisateur n'existe pas : `401 Unauthorized`
- Si l'utilisateur existe : `200 OK` avec token

## ⚠️ Si ERR_CONNECTION_REFUSED

### 1. Vérifier que le serveur est démarré
```bash
cd backend
npm run dev
```

Vous devriez voir :
```
🚀 Server running on port 3000
```

### 2. Vérifier le port
Le serveur doit écouter sur le port **3000** (ou le port défini dans `.env`)

### 3. Vérifier les variables d'environnement
Assurez-vous que toutes les variables nécessaires sont définies dans `backend/.env`

## ✅ Checklist

- [ ] Serveur backend démarré (`npm run dev` dans `backend/`)
- [ ] Serveur répond sur `http://localhost:3000`
- [ ] Health check fonctionne
- [ ] Route racine fonctionne
- [ ] CORS configuré pour `http://localhost:8081`
- [ ] Frontend peut se connecter

## 🎯 Prochaines Étapes

1. Vérifiez que le serveur backend est démarré
2. Testez l'inscription/connexion depuis le frontend
3. Vérifiez les logs du serveur pour voir les requêtes








