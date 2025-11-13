# 🗄️ Configuration PostgreSQL sur Render

## 📋 Vue d'ensemble

Vous avez deux options pour PostgreSQL :
1. **Supabase PostgreSQL** (recommandé - déjà configuré) ✅
2. **Render PostgreSQL** (alternative)

## ✅ Option 1 : Utiliser Supabase PostgreSQL (Recommandé)

Vous utilisez déjà Supabase, donc **pas besoin de créer une base de données sur Render**.

### Configuration actuelle
- **SUPABASE_URL** : URL de votre projet Supabase
- **DATABASE_URL** : URL de connexion PostgreSQL de Supabase

### Obtenir DATABASE_URL depuis Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Database**
4. Dans la section **Connection string**, copiez l'URL **URI** ou **Connection pooling**

**Format de l'URL :**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Exemple :**
```
postgresql://postgres.abcdefghijklmnop:VotreMotDePasse@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### Ajouter dans Render

Dans Render → Votre service → **Environment** → Ajoutez :
```
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

⚠️ **Important** : Utilisez le **Connection Pooling** (port 6543) pour la production, pas le port direct (5432).

---

## 🔄 Option 2 : Créer PostgreSQL sur Render

Si vous préférez utiliser Render PostgreSQL au lieu de Supabase :

### 1. Créer la base de données

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **New** → **PostgreSQL**
3. Configurez :
   - **Name** : `amda-database`
   - **Database** : `amda` (ou laissez par défaut)
   - **User** : `amda_user` (ou laissez par défaut)
   - **Region** : Même région que votre backend (recommandé)
   - **PostgreSQL Version** : 15 ou 16 (recommandé)
   - **Plan** : Free (pour tester) ou Starter (pour production)

4. Cliquez sur **Create Database**

### 2. Obtenir l'URL de connexion

Une fois créée, Render affichera l'**Internal Database URL** :

**Format :**
```
postgresql://amda_user:password@dpg-xxxxx-a.oregon-postgres.render.com/amda
```

### 3. Ajouter dans les variables d'environnement

Dans Render → Votre service backend → **Environment** → Ajoutez :

```
DATABASE_URL=postgresql://amda_user:password@dpg-xxxxx-a.oregon-postgres.render.com/amda
```

### 4. Utiliser l'URL interne vs externe

**Internal Database URL** (recommandé) :
- ✅ Plus rapide (même réseau interne)
- ✅ Gratuit (pas de bande passante)
- ✅ Format : `postgresql://user:pass@dpg-xxx-a.region-postgres.render.com/dbname`

**External Database URL** :
- ⚠️ Plus lent (via Internet)
- ⚠️ Peut avoir des coûts de bande passante
- ⚠️ Format : `postgresql://user:pass@dpg-xxx-a.oregon-postgres.render.com:5432/dbname`

---

## 🔧 Configuration dans render.yaml

Si vous voulez que Render configure automatiquement la connexion, ajoutez dans `render.yaml` :

```yaml
services:
  - type: web
    name: amda-backend
    # ... autres configs ...
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: amda-database  # Nom de votre base de données Render
          property: connectionString
```

Cela connectera automatiquement votre service à la base de données.

---

## ⚠️ Différence : Supabase vs Render PostgreSQL

### Supabase PostgreSQL
- ✅ **Gratuit** jusqu'à 500 MB
- ✅ **Storage** inclus (pour les médias)
- ✅ **Auth** intégré
- ✅ **Dashboard** complet
- ✅ **Backups** automatiques
- ✅ **Connection Pooling** inclus

### Render PostgreSQL
- ✅ **Gratuit** (plan Free - 90 jours)
- ✅ **Simple** à configurer
- ❌ Pas de Storage (juste la base de données)
- ❌ Pas d'Auth intégré
- ⚠️ Plan Free limité à 90 jours

---

## 🎯 Recommandation

**Utilisez Supabase PostgreSQL** car :
1. Vous l'utilisez déjà pour le Storage
2. C'est gratuit et généreux
3. Tout est centralisé
4. Meilleure intégration avec votre stack

**Utilisez Render PostgreSQL** seulement si :
- Vous voulez tout sur Render
- Vous avez besoin d'une base de données séparée
- Vous préférez la simplicité Render

---

## 📝 Variables d'environnement complètes

Pour Supabase (recommandé) :
```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SUPABASE_STORAGE_BUCKET=amda-media
```

Pour Render PostgreSQL :
```env
DATABASE_URL=postgresql://user:pass@dpg-xxx-a.oregon-postgres.render.com/dbname
# Pas besoin de SUPABASE_URL si vous n'utilisez pas Supabase
```

---

## 🔍 Vérification

Pour vérifier que la connexion fonctionne :

1. **Dans les logs Render** :
   - Cherchez "Database connected" ou "Connected to PostgreSQL"
   - Pas d'erreurs de connexion

2. **Test manuel** :
   - Testez l'endpoint `/health` de votre API
   - Vérifiez que les requêtes fonctionnent

3. **Dans Supabase Dashboard** :
   - Allez dans **Database** → **Table Editor**
   - Vérifiez que les tables existent

---

## 🐛 Dépannage

### Erreur : "Connection refused"
- Vérifiez que l'URL est correcte
- Vérifiez que la base de données est active sur Render
- Utilisez l'Internal Database URL si possible

### Erreur : "Authentication failed"
- Vérifiez le mot de passe dans l'URL
- Régénérez le mot de passe si nécessaire

### Erreur : "Database does not exist"
- Vérifiez le nom de la base de données dans l'URL
- Créez la base de données si elle n'existe pas

---

## ✅ Résumé

**Pour votre cas (utilisant Supabase)** :
1. ✅ Utilisez **Supabase PostgreSQL** (déjà configuré)
2. ✅ Copiez le **DATABASE_URL** depuis Supabase Dashboard
3. ✅ Ajoutez-le dans Render → Environment
4. ✅ Utilisez le **Connection Pooling** (port 6543) pour la production

Pas besoin de créer une base de données sur Render ! 🎉

