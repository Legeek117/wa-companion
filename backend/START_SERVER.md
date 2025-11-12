# 🚀 Démarrer le Serveur Backend

## 📋 Commandes

### Démarrer le serveur en mode développement
```bash
cd backend
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:3000`

### Vérifier que le serveur fonctionne
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

## ⚠️ Problèmes Courants

### ERR_CONNECTION_REFUSED
- **Cause** : Le serveur backend n'est pas démarré
- **Solution** : Démarrez le serveur avec `npm run dev` dans le dossier `backend`

### Port déjà utilisé
- **Cause** : Un autre processus utilise le port 3000
- **Solution** : 
  - Changez le port dans `.env` : `PORT=3001`
  - Ou arrêtez le processus qui utilise le port 3000

### Erreur de variables d'environnement
- **Cause** : Variables manquantes dans `.env`
- **Solution** : Vérifiez que toutes les variables Supabase et JWT sont définies

## ✅ Checklist

- [ ] Serveur backend démarré (`npm run dev` dans `backend/`)
- [ ] Serveur répond sur `http://localhost:3000`
- [ ] Health check fonctionne (`/health`)
- [ ] Variables d'environnement configurées
- [ ] Frontend peut se connecter au backend








