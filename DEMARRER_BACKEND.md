# 🚀 Démarrer le Backend - Guide Rapide

## ⚠️ Problème : ERR_CONNECTION_REFUSED

Cette erreur signifie que le **serveur backend n'est pas démarré** ou **ne répond pas**.

## ✅ Solution : Démarrer le Serveur

### 1. Ouvrir un Terminal dans le dossier `backend`

```bash
cd backend
```

### 2. Démarrer le serveur

```bash
npm run dev
```

### 3. Vérifier que le serveur démarre

Vous devriez voir :
```
🚀 Server running on port 3000
```

**Si vous voyez des erreurs** :
- Vérifiez que toutes les variables d'environnement sont définies dans `backend/.env`
- Vérifiez que Supabase est configuré correctement

### 4. Vérifier que le serveur fonctionne

Dans un **autre terminal**, testez :
```bash
curl http://localhost:3000/health
```

Vous devriez voir :
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development"
}
```

## 🔧 Si le Serveur ne Démarre Pas

### Erreur : "Missing required environment variable"
- **Solution** : Vérifiez que toutes les variables Supabase et JWT sont définies dans `backend/.env`

### Erreur : "Failed to connect to Supabase"
- **Solution** : Vérifiez vos credentials Supabase dans `backend/.env`

### Erreur : "Port already in use"
- **Solution** : Changez le port dans `backend/.env` : `PORT=3001`

## ✅ Checklist

- [ ] Terminal ouvert dans `backend/`
- [ ] Serveur démarré avec `npm run dev`
- [ ] Message "🚀 Server running on port 3000" visible
- [ ] Health check fonctionne (`curl http://localhost:3000/health`)
- [ ] Frontend peut se connecter

## 🎯 Une Fois le Serveur Démarré

1. **Ne fermez PAS le terminal** - Le serveur doit rester en cours d'exécution
2. **Testez depuis le frontend** - Allez sur `http://localhost:8081/auth`
3. **Testez l'inscription/connexion** - Ça devrait fonctionner maintenant !

## 📝 Note

Le serveur backend doit **rester en cours d'exécution** pendant que vous utilisez le frontend. Si vous fermez le terminal, le serveur s'arrête et vous aurez à nouveau l'erreur `ERR_CONNECTION_REFUSED`.











