# 🗄️ Supabase Database Schema - AMDA

## 📋 Vue d'ensemble

Ce dossier contient le schéma de base de données complet pour AMDA, incluant :
- Toutes les tables nécessaires
- Indexes pour les performances
- Triggers et fonctions
- Row Level Security (RLS) policies

## 📁 Fichiers

- **`schema.sql`** : Schéma complet avec toutes les tables, indexes, triggers et RLS
- **`migrations/`** : Migrations SQL (pour versioning)

## 🗂️ Tables Créées

### 1. **users**
Stoque les informations des utilisateurs
- `id`, `email`, `password_hash`, `plan` (free/premium), `subscription_id`

### 2. **subscriptions**
Gère les abonnements Stripe
- `stripe_subscription_id`, `stripe_customer_id`, `plan`, `status`, `current_period_start/end`

### 3. **whatsapp_sessions**
Sessions WhatsApp pour chaque utilisateur
- `session_id`, `qr_code`, `status`, `session_data` (JSONB)

### 4. **status_likes**
Historique des status likés
- `contact_id`, `contact_name`, `status_id`, `emoji_used`, `liked_at`

### 5. **status_auto_like_config** (Premium)
Configuration auto-like par contact
- `contact_id`, `enabled`, `emoji` (personnalisé par contact)

### 6. **view_once_captures**
View Once sauvegardés
- `sender_id`, `sender_name`, `media_url`, `media_type`, `captured_at`

### 7. **deleted_messages**
Messages supprimés capturés
- `sender_id`, `sender_name`, `content`, `media_url`, `sent_at`, `deleted_at`, `delay_seconds`

### 8. **autoresponder_config**
Configuration du répondeur automatique
- `mode` (offline, busy, meeting, vacation, custom), `message`, `enabled`, `schedule_config` (JSONB)

### 9. **autoresponder_contacts** (Premium)
Filtrage par contact pour le répondeur
- `contact_id`, `contact_name`, `enabled`, `custom_message`

### 10. **scheduled_statuses**
Status programmés
- `media_url`, `caption`, `scheduled_at`, `published_at`, `status` (pending/published/failed)

### 11. **quotas**
Quotas utilisateurs (Gratuit)
- `view_once_count`, `deleted_messages_count`, `scheduled_statuses_count`, `reset_date`

### 12. **analytics** (Premium)
Statistiques quotidiennes
- `date`, `status_likes_count`, `view_once_captures_count`, etc.

## 🚀 Installation

### Option 1 : Via Supabase Dashboard

1. Aller sur votre projet Supabase
2. SQL Editor → New Query
3. Copier-coller le contenu de `schema.sql`
4. Exécuter la requête

### Option 2 : Via Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Link votre projet
supabase link --project-ref your-project-ref

# Appliquer le schéma
supabase db push
```

### Option 3 : Via psql

```bash
psql -h your-project.supabase.co -U postgres -d postgres -f schema.sql
```

## 🔐 Row Level Security (RLS)

Toutes les tables ont RLS activé avec des policies qui permettent :
- ✅ Les utilisateurs de voir uniquement leurs propres données
- ✅ Les utilisateurs de modifier uniquement leurs propres données
- ✅ Le backend (service role) d'accéder à toutes les données

## 📊 Indexes

Des indexes ont été créés pour optimiser les requêtes fréquentes :
- Recherche par `user_id`
- Recherche par `contact_id`
- Tri par date (`created_at`, `deleted_at`, etc.)
- Recherche par statut (`status`, `enabled`, etc.)

## 🔄 Triggers

### Auto-update `updated_at`
Toutes les tables avec `updated_at` ont un trigger qui met à jour automatiquement ce champ.

### Initialisation quota
Quand un nouvel utilisateur est créé, un quota est automatiquement initialisé avec la date de reset du mois suivant.

## 📝 Notes Importantes

1. **UUID** : Toutes les clés primaires utilisent UUID (via extension `uuid-ossp`)
2. **Timestamps** : Tous les timestamps utilisent `TIMESTAMP WITH TIME ZONE`
3. **RLS** : Les policies utilisent `auth.uid()` pour identifier l'utilisateur
4. **Cascade** : Les suppressions en cascade sont configurées pour maintenir l'intégrité

## 🧪 Vérification

Après avoir appliqué le schéma, vérifier :

```sql
-- Vérifier que toutes les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Vérifier les indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Vérifier les triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

## 🔧 Maintenance

### Reset mensuel des quotas

Créer un job cron dans Supabase pour exécuter :

```sql
UPDATE quotas 
SET 
  view_once_count = 0,
  deleted_messages_count = 0,
  scheduled_statuses_count = 0,
  reset_date = DATE_TRUNC('month', NOW())::DATE + INTERVAL '1 month',
  updated_at = NOW()
WHERE reset_date < NOW();
```

### Nettoyage des données anciennes

```sql
-- Supprimer les captures View Once de plus de 1 an (optionnel)
DELETE FROM view_once_captures 
WHERE captured_at < NOW() - INTERVAL '1 year';

-- Supprimer les messages supprimés de plus de 1 an (optionnel)
DELETE FROM deleted_messages 
WHERE deleted_at < NOW() - INTERVAL '1 year';
```

## 📚 Documentation Supabase

- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Database Triggers](https://supabase.com/docs/guides/database/triggers)

