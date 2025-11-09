# 📊 Gestion des Quotas - AMDA

## 🎯 Vue d'ensemble

Le système de quotas limite l'utilisation des fonctionnalités pour les utilisateurs **Gratuit** :
- **View Once** : 3 captures / mois
- **Messages Supprimés** : 3 messages / mois
- **Status Programmés** : 1 status / semaine

Les utilisateurs **Premium** ont des quotas illimités.

## 📋 Table `quotas`

```sql
CREATE TABLE quotas (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  view_once_count INTEGER DEFAULT 0,
  deleted_messages_count INTEGER DEFAULT 0,
  scheduled_statuses_count INTEGER DEFAULT 0,
  reset_date DATE NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🔄 Reset Mensuel

### Automatique via Trigger

Un trigger crée automatiquement un quota lors de la création d'un utilisateur avec :
- `reset_date` = début du mois suivant

### Job de Reset

Créer un job cron dans Supabase pour exécuter chaque mois :

```sql
-- Reset des quotas mensuels
UPDATE quotas 
SET 
  view_once_count = 0,
  deleted_messages_count = 0,
  scheduled_statuses_count = 0,
  reset_date = DATE_TRUNC('month', NOW())::DATE + INTERVAL '1 month',
  updated_at = NOW()
WHERE reset_date < NOW();
```

## ✅ Vérification des Quotas

### View Once (3/mois)

```sql
-- Vérifier si l'utilisateur peut capturer un View Once
SELECT 
  user_id,
  view_once_count,
  CASE 
    WHEN plan = 'premium' THEN TRUE
    WHEN view_once_count < 3 THEN TRUE
    ELSE FALSE
  END AS can_capture
FROM quotas q
JOIN users u ON u.id = q.user_id
WHERE user_id = 'user-uuid';
```

### Messages Supprimés (3/mois)

```sql
-- Vérifier si l'utilisateur peut sauvegarder un message supprimé
SELECT 
  user_id,
  deleted_messages_count,
  CASE 
    WHEN plan = 'premium' THEN TRUE
    WHEN deleted_messages_count < 3 THEN TRUE
    ELSE FALSE
  END AS can_save
FROM quotas q
JOIN users u ON u.id = q.user_id
WHERE user_id = 'user-uuid';
```

### Status Programmés (1/semaine)

```sql
-- Vérifier si l'utilisateur peut programmer un status
SELECT 
  user_id,
  scheduled_statuses_count,
  CASE 
    WHEN plan = 'premium' THEN TRUE
    WHEN scheduled_statuses_count < 1 THEN TRUE
    ELSE FALSE
  END AS can_schedule
FROM quotas q
JOIN users u ON u.id = q.user_id
WHERE user_id = 'user-uuid';
```

## 📈 Incrémentation des Quotas

### View Once

```sql
-- Incrémenter le compteur View Once
UPDATE quotas 
SET 
  view_once_count = view_once_count + 1,
  updated_at = NOW()
WHERE user_id = 'user-uuid';
```

### Messages Supprimés

```sql
-- Incrémenter le compteur Messages Supprimés
UPDATE quotas 
SET 
  deleted_messages_count = deleted_messages_count + 1,
  updated_at = NOW()
WHERE user_id = 'user-uuid';
```

### Status Programmés

```sql
-- Incrémenter le compteur Status Programmés
UPDATE quotas 
SET 
  scheduled_statuses_count = scheduled_statuses_count + 1,
  updated_at = NOW()
WHERE user_id = 'user-uuid';
```

## 🔄 Reset Hebdomadaire (Status Programmés)

Pour les status programmés, le reset est **hebdomadaire** (pas mensuel) :

```sql
-- Reset hebdomadaire des status programmés (Gratuit uniquement)
UPDATE quotas 
SET 
  scheduled_statuses_count = 0,
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users WHERE plan = 'free'
)
AND EXTRACT(WEEK FROM NOW()) != EXTRACT(WEEK FROM updated_at);
```

## 💎 Premium : Quotas Illimités

Les utilisateurs Premium n'ont pas de limites. Vérifier le plan avant d'incrémenter :

```sql
-- Vérifier le plan avant d'incrémenter
SELECT plan FROM users WHERE id = 'user-uuid';

-- Si plan = 'premium', ne pas incrémenter le quota
-- Si plan = 'free', incrémenter normalement
```

## 📊 Statistiques des Quotas

```sql
-- Voir les quotas d'un utilisateur
SELECT 
  u.email,
  u.plan,
  q.view_once_count,
  q.deleted_messages_count,
  q.scheduled_statuses_count,
  q.reset_date,
  CASE 
    WHEN u.plan = 'premium' THEN 'Illimité'
    ELSE CONCAT(q.view_once_count, '/3')
  END AS view_once_quota,
  CASE 
    WHEN u.plan = 'premium' THEN 'Illimité'
    ELSE CONCAT(q.deleted_messages_count, '/3')
  END AS deleted_messages_quota,
  CASE 
    WHEN u.plan = 'premium' THEN 'Illimité'
    ELSE CONCAT(q.scheduled_statuses_count, '/1')
  END AS scheduled_statuses_quota
FROM quotas q
JOIN users u ON u.id = q.user_id
WHERE q.user_id = 'user-uuid';
```

## 🚨 Gestion des Erreurs

### Quota Dépassé

Quand un quota est dépassé, retourner une erreur :

```typescript
// Exemple en TypeScript
if (user.plan === 'free' && quota.view_once_count >= 3) {
  throw new QuotaExceededError('View Once quota exceeded. Upgrade to Premium for unlimited captures.');
}
```

### Message d'Upgrade

Quand un quota est proche d'être dépassé, afficher un message d'upgrade :

```typescript
if (user.plan === 'free' && quota.view_once_count >= 2) {
  // Afficher: "1 capture restante. Upgrade to Premium for unlimited!"
}
```

