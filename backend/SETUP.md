# Setup - Développement Local AMDA avec Prisma + PostgreSQL

## Prérequis

- Node.js 20+
- Docker + Docker Compose (pour PostgreSQL/Redis en dev)
- npm ou yarn

## 1. Installation Initiale

```bash
cd backend

# Installer les dépendances
npm install

# Générer le client Prisma
npm run prisma:generate
```

## 2. Configuration Variables d'Environnement

```bash
# Copier le template
cp .env.example .env

# Éditer .env avec tes valeurs
nano .env

# Exemple minimum pour dev local:
DATABASE_URL="postgresql://postgres:password@localhost:5432/amda"
JWT_SECRET="dev-secret-min-32-chars-long-randomstring"
JWT_REFRESH_SECRET="dev-refresh-secret-min-32-chars-long-randomstring"
```

Générer des secrets aléatoires :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Démarrer PostgreSQL en Docker

```bash
# Terminal 1 : démarrer les services
docker-compose -f docker-compose.dev.yml up

# Terminal 2 : reste pour backend
```

Vérifier que PostgreSQL est prêt :
```bash
docker-compose -f docker-compose.dev.yml logs postgres
# Tu dois voir: "database system is ready to accept connections"
```

## 4. Initialiser la Base de Données

```bash
# Appliquer les migrations Prisma
npm run prisma:migrate

# Ou en développement (crée migration interactive):
npx prisma migrate dev --name init
```

Vérifier le schéma :
```bash
npm run prisma:studio
# Ouvre http://localhost:5555 - interface visuelle de la DB
```

## 5. Démarrer le Backend

```bash
npm run dev
# Output attendu:
# ✅ Prisma client initialized
# ✅ Server running on http://localhost:3000
# ✅ /uploads directory created
# ✅ /sessions directory created
```

## 6. Tester l'API

### Health Check
```bash
curl http://localhost:3000/health
```

### Signup
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

Response attendue:
```json
{
  "user": {
    "id": "uuid...",
    "email": "test@example.com",
    "plan": "free",
    "created_at": "2026-08-04T..."
  },
  "token": "eyJhbGc..."
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

### Get User (authentifié)
```bash
# Remplacer TOKEN par le token du signup/login
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## 7. Développement

### Fichiers Clés

```
backend/
├── prisma/
│   ├── schema.prisma         ← Schéma BD + enums
│   └── migrations/           ← Migrations SQL générées
├── src/
│   ├── config/
│   │   ├── database.ts       ← Singleton Prisma (NEW)
│   │   └── env.ts           ← Variables (ADAPTER)
│   ├── services/
│   │   ├── auth.service.ts       ← (CONVERTED)
│   │   ├── quota.service.ts      ← (CONVERTED)
│   │   ├── storage.service.ts    ← (NEW)
│   │   └── ...*.service.ts       ← (À CONVERTIR)
│   ├── controllers/
│   └── routes/
├── .env.example              ← (NEW)
└── docker-compose.dev.yml    ← (NEW)
```

### Workflow Développement

```bash
# Terminal 1: Docker (reste actif)
docker-compose -f docker-compose.dev.yml up

# Terminal 2: Backend (hot-reload via nodemon)
npm run dev

# Terminal 3: Tests / CLI
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer ..."

# Terminal 4: Inspecteur BD (optionnel)
npm run prisma:studio
```

## 8. Erreurs Courantes

### ❌ "Error: ECONNREFUSED localhost:5432"

→ PostgreSQL n'est pas lancé. Faire `docker-compose -f docker-compose.dev.yml up`

### ❌ "PrismaClientRustPanicError"

→ Prisma client out-of-sync avec schema. Faire:
```bash
npm run prisma:generate
```

### ❌ "Error: Column 'xyz' does not exist"

→ Migration pas appliquée. Faire:
```bash
npx prisma migrate dev
```

### ❌ "Ports already in use"

→ Changer dans `.env` ou docker-compose.yml:
```bash
# docker-compose.dev.yml
services:
  postgres:
    ports:
      - "5433:5432"  # ← Change 5432 → 5433
```

Puis `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5433/amda"
```

## 9. Avant de Déployer

```bash
# Type-check
npm run type-check

# Build production
npm run build

# Vérifier sortie dist/
ls dist/

# Tester build local
NODE_ENV=production node dist/server.js
```

## 10. Cleanup/Reset

### Réinitialiser la BD (ATTENTION - perte de données)

```bash
# Supprimer et recréer
npx prisma migrate reset

# Ou via Docker
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up
npm run prisma:migrate
```

### Nettoyer les uploads

```bash
rm -rf ./uploads/*
```

### Logs Prisma (debug)

```bash
# Activer logs Prisma
export DEBUG="prisma:*"
npm run dev
```

## 11. Intégration Frontend (Netlify/Vite)

Depuis le dossier racine:

```bash
# Terminal 5: Frontend
npm run dev

# Ouvre http://localhost:5173
# Configure pour pointer sur backend local
# VITE_API_URL=http://localhost:3000
```

Vérifier `.env` frontend:
```
VITE_API_URL=http://localhost:3000
```

## Support

Problèmes ? Vérifier les logs:

```bash
# Backend logs
docker-compose -f docker-compose.dev.yml logs -f postgres

# Prisma logs
DEBUG=prisma:* npm run dev

# Query issues
npm run prisma:studio
# Inspecteur graphique ← très utile pour déboguer
```

---

**Prêt? C'est parti!** 🚀

```bash
docker-compose -f docker-compose.dev.yml up &
npm run dev
```
