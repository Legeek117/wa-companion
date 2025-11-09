# AMDA Backend API

Backend API pour AMDA - Assistant WhatsApp Multifonctions

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+ (LTS)
- PostgreSQL (via Supabase)
- Redis (optionnel pour le développement local)

### Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables d'environnement dans .env
```

### Configuration

Éditez le fichier `.env` avec vos clés :
- Supabase URL et clés
- Redis URL
- JWT secrets
- Stripe keys
- Cloudinary ou AWS S3

### Développement

```bash
# Lancer en mode développement (avec hot-reload)
npm run dev

# Lancer en mode production
npm run build
npm start
```

### Structure du Projet

```
backend/
├── src/
│   ├── config/         # Configuration (DB, Redis, Stripe)
│   ├── controllers/     # Handlers des routes
│   ├── services/       # Logique métier
│   ├── models/         # Modèles de données
│   ├── routes/         # Définition des routes
│   ├── middleware/     # Middlewares Express
│   ├── utils/          # Utilitaires
│   ├── jobs/           # Tâches programmées
│   ├── queues/         # Queues Redis
│   ├── types/          # Types TypeScript
│   ├── app.ts          # Configuration Express
│   └── server.ts       # Point d'entrée
```

## 📚 Documentation API

L'API sera disponible sur `http://localhost:3000/api`

### Endpoints Principaux

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/whatsapp/qr` - Obtenir QR code WhatsApp
- `GET /api/status` - Liste des status
- `POST /api/status/like` - Liker un status
- `GET /api/view-once` - Liste View Once
- `GET /api/deleted-messages` - Messages supprimés
- `POST /api/autoresponder` - Configurer répondeur
- `POST /api/subscription/create` - Créer abonnement Stripe

## 🔧 Technologies

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **@whiskeysockets/baileys** - WhatsApp Web API
- **Supabase** - PostgreSQL database
- **Redis** - Cache et queues
- **Stripe** - Paiements
- **JWT** - Authentification
- **Cloudinary/S3** - Stockage médias

## 📝 License

ISC

