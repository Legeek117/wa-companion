# 🚀 Guide de Démarrage - Backend AMDA

## ✅ Ce qui a été créé

La structure complète du backend a été initialisée avec :

- ✅ **Configuration complète** : TypeScript, Express, Supabase, Redis, Stripe
- ✅ **Structure de dossiers** : Controllers, Services, Routes, Middlewares, Utils
- ✅ **Middlewares** : Authentification JWT, Gestion d'erreurs, Rate limiting
- ✅ **Routes** : Toutes les routes API (structure prête)
- ✅ **Types TypeScript** : Types pour WhatsApp, User, etc.
- ✅ **Validators** : Schémas Zod pour validation
- ✅ **Logger** : Pino pour les logs
- ✅ **Configuration** : Variables d'environnement, configs

## 📦 Installation

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Configurer les variables d'environnement

```bash
# Copier le template
cp env.template .env

# Éditer .env avec vos clés
# - Supabase URL et clés
# - Redis URL
# - JWT secrets
# - Stripe keys
# - Cloudinary ou AWS S3
```

### 3. Démarrer en développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## 🔧 Configuration Requise

### Variables d'environnement essentielles

```env
# Minimum requis pour démarrer
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Optionnel (pour fonctionnalités complètes)

```env
# Redis (pour cache et queues)
REDIS_URL=redis://localhost:6379

# Stripe (pour paiements)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Storage (Cloudinary ou AWS S3)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📁 Structure des Fichiers

```
backend/
├── src/
│   ├── config/          # Configuration (DB, Redis, Stripe, Logger)
│   ├── controllers/     # Handlers des routes (à implémenter)
│   ├── services/       # Logique métier (à implémenter)
│   ├── routes/          # Définition des routes (structure créée)
│   ├── middleware/      # Middlewares Express (auth, error, rate limit)
│   ├── utils/           # Utilitaires (errors, helpers, validators)
│   ├── types/           # Types TypeScript
│   ├── jobs/            # Tâches programmées (à implémenter)
│   ├── app.ts           # Configuration Express
│   └── server.ts        # Point d'entrée
```

## 🎯 Prochaines Étapes

### 1. Créer le schéma Supabase
- Créer les tables dans Supabase
- Configurer Row Level Security (RLS)

### 2. Implémenter l'authentification
- Service auth (register, login, JWT)
- Controller auth
- Routes auth

### 3. Intégrer WhatsApp
- Service WhatsApp (baileys)
- Controller WhatsApp
- Routes WhatsApp
- Gestion QR code

### 4. Développer les fonctionnalités
- Auto-like status
- Capture View Once
- Messages supprimés
- Répondeur automatique
- Status programmés

### 5. Intégrer Stripe
- Service Stripe
- Controller Stripe
- Webhooks Stripe

## 🧪 Tester le Backend

### Health Check

```bash
curl http://localhost:3000/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "environment": "development"
}
```

### API Routes (quand implémentées)

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/whatsapp/qr` - QR code WhatsApp
- `GET /api/status` - Liste des status
- `POST /api/status/like` - Liker un status
- `GET /api/view-once` - View Once capturés
- `GET /api/deleted-messages` - Messages supprimés
- `POST /api/autoresponder` - Configurer répondeur
- `POST /api/subscription/create-checkout` - Créer abonnement

## 📚 Documentation

- **Architecture** : Voir `ARCHITECTURE_BACKEND.md`
- **Structure** : Voir `STRUCTURE.md`
- **README** : Voir `README.md`

## ⚠️ Notes Importantes

1. **Variables d'environnement** : Ne jamais commiter le fichier `.env`
2. **Secrets JWT** : Utiliser des secrets forts en production
3. **Supabase** : Utiliser la clé service role pour le backend
4. **Redis** : Optionnel pour le développement local
5. **Stripe** : Utiliser les clés de test pour le développement

## 🐛 Dépannage

### Erreur "Missing required environment variable"
- Vérifier que le fichier `.env` existe
- Vérifier que toutes les variables requises sont définies

### Erreur de connexion Redis
- Redis est optionnel pour le développement
- Vérifier que Redis est démarré si utilisé

### Erreur de connexion Supabase
- Vérifier les clés Supabase dans `.env`
- Vérifier que le projet Supabase est actif

## 📞 Support

Pour toute question, voir la documentation dans les fichiers :
- `ARCHITECTURE_BACKEND.md`
- `STRUCTURE.md`
- `README.md`

