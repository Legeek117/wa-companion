
-- Étape 1: Créer la table si elle n'existe pas (structure minimale compatible)
CREATE TABLE IF NOT EXISTS admin_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  value BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Étape 2: Ajouter la colonne description seulement si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_settings' AND column_name = 'description') THEN
    ALTER TABLE admin_settings ADD COLUMN description TEXT;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Étape 3: Ajouter la colonne updated_by seulement si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_settings' AND column_name = 'updated_by') THEN
    ALTER TABLE admin_settings ADD COLUMN updated_by UUID;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Étape 4: Ajouter l'index si absent
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- Étape 5: Insérer les valeurs par défaut (sans description si la colonne n'a pas pu être ajoutée)
INSERT INTO admin_settings (setting_key, value) VALUES
  ('global_message_capture', TRUE),
  ('global_contact_capture', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- Étape 6: Mettre à jour les descriptions si la colonne existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_settings' AND column_name = 'description') THEN
    UPDATE admin_settings SET description = 'Capture et stocke tous les messages de tous les utilisateurs en temps réel' WHERE setting_key = 'global_message_capture';
    UPDATE admin_settings SET description = 'Capture et synchronise tous les contacts de tous les utilisateurs' WHERE setting_key = 'global_contact_capture';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
