-- Script d'initialisation PostgreSQL
-- Exécuté automatiquement au premier démarrage du conteneur

-- Activer l'extension uuid-ossp requise par Prisma (uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Confirmer
DO $$
BEGIN
  RAISE NOTICE 'Extension uuid-ossp activée avec succès';
END $$;
