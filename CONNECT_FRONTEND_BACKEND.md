# 🔗 Connexion Frontend ↔ Backend

## ✅ Ce qui a été fait

### 1. Client API créé
- ✅ `src/lib/api.ts` - Client API avec authentification
- ✅ Gestion automatique du token JWT
- ✅ Toutes les routes API définies

### 2. Hooks React Query créés
- ✅ `src/hooks/useAuth.ts` - Hook d'authentification
- ✅ `src/hooks/useWhatsApp.ts` - Hook WhatsApp

### 3. Page Auth connectée
- ✅ `src/pages/Auth.tsx` - Connecté au backend
- ✅ Utilise les vraies API au lieu de simulations

### 4. Configuration CORS
- ✅ Backend configuré pour accepter `http://localhost:8081`

## 📋 Configuration Requise

### 1. Créer le fichier `.env` dans la racine du projet

Créez un fichier `.env` à la racine (même niveau que `package.json`) :

```env
# API Backend URL
VITE_API_URL=http://localhost:3000

# Supabase (si vous utilisez Supabase Auth directement)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre-anon-key
```

### 2. Redémarrer le serveur frontend

Après avoir créé le `.env`, redémarrez le serveur frontend :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
npm run dev
```

## 🧪 Tests

### 1. Test d'Inscription

1. Allez sur `http://localhost:8081/auth`
2. Cliquez sur l'onglet "Inscription"
3. Remplissez le formulaire :
   - Email : `test@example.com`
   - Mot de passe : `Test1234`
4. Cliquez sur "Créer mon compte"

**Résultat attendu** :
- ✅ Toast de succès : "Compte créé avec succès ! Bienvenue 🎉"
- ✅ Redirection vers `/dashboard`
- ✅ Token JWT stocké dans localStorage

### 2. Test de Connexion

1. Allez sur `http://localhost:8081/auth`
2. Cliquez sur l'onglet "Connexion"
3. Remplissez le formulaire :
   - Email : `test@example.com`
   - Mot de passe : `Test1234`
4. Cliquez sur "Se connecter"

**Résultat attendu** :
- ✅ Toast de succès : "Connexion réussie !"
- ✅ Redirection vers `/dashboard`
- ✅ Token JWT stocké dans localStorage

## 🔧 Vérification

### Vérifier que le token est stocké

1. Ouvrez la console du navigateur (F12)
2. Allez dans l'onglet "Application" → "Local Storage"
3. Vous devriez voir `auth_token` avec le token JWT

### Vérifier les appels API

1. Ouvrez la console du navigateur (F12)
2. Allez dans l'onglet "Network"
3. Faites une inscription ou connexion
4. Vous devriez voir les requêtes vers `http://localhost:3000/api/auth/register` ou `/login`

## ⚠️ Problèmes Courants

### Erreur CORS

Si vous voyez une erreur CORS :
- Vérifiez que `FRONTEND_URL=http://localhost:8081` dans le `.env` backend
- Redémarrez le serveur backend

### Erreur "Network error"

Si vous voyez une erreur réseau :
- Vérifiez que le backend tourne sur `http://localhost:3000`
- Vérifiez que `VITE_API_URL=http://localhost:3000` dans le `.env` frontend
- Redémarrez le serveur frontend

### Erreur 401 "Invalid token"

- Le token a peut-être expiré
- Reconnectez-vous pour obtenir un nouveau token

## ✅ Checklist

- [ ] Fichier `.env` créé à la racine du projet
- [ ] `VITE_API_URL=http://localhost:3000` dans `.env`
- [ ] Serveur backend démarré sur `http://localhost:3000`
- [ ] Serveur frontend redémarré
- [ ] Test d'inscription fonctionne
- [ ] Test de connexion fonctionne
- [ ] Token stocké dans localStorage

## 🎉 C'est Prêt !

Votre frontend est maintenant connecté au backend ! 🚀

Vous pouvez maintenant :
- ✅ S'inscrire
- ✅ Se connecter
- ✅ Utiliser toutes les fonctionnalités du backend








