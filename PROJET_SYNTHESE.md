# 📋 SYNTHÈSE DU PROJET AMDA

## 🎯 VISION GLOBALE

**AMDA** = Assistant WhatsApp Multifonctions avec Dashboard Web et modèle économique **Freemium**

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Backend
- **Node.js + Express.js** : API REST
- **@whiskeysockets/baileys** : Connexion WhatsApp Web
- **PostgreSQL (Supabase)** : Base de données
- **Redis** : Cache et queues pour performances
- **JWT** : Authentification sécurisée
- **Stripe** : Gestion des paiements

### Frontend
- **React 18+ + Vite** : Framework UI
- **Tailwind CSS + shadcn/ui** : Design system
- **React Router** : Navigation
- **Zustand/Context API** : State management
- **React Query** : Data fetching
- **Recharts** : Graphiques analytics

### Infrastructure
- **Backend** : Railway / Render / VPS
- **Frontend** : Vercel / Netlify
- **BDD** : Supabase (PostgreSQL)
- **Médias** : Cloudinary ou AWS S3
- **CDN** : Cloudflare

---

## 💎 MODÈLE FREEMIUM

### 🆓 PLAN GRATUIT
- ✅ Auto-like **TOUS** les status (emoji configurable)
- ✅ **3 captures View Once** / mois
- ✅ **3 messages supprimés** / mois
- ✅ **1 status programmé** / semaine
- ✅ Répondeur automatique **basique** (2 modes, messages non modifiables, **TOUS** les contacts reçoivent la réponse)

### 💎 PLAN PREMIUM (7,99€/mois ou 79,99€/an)
- ✅ Like **sélectif** par contact (whitelist/blacklist)
- ✅ Emoji **personnalisé** par contact
- ✅ View Once **illimité** + galerie avancée
- ✅ Messages supprimés **illimités** + recherche/export
- ✅ Status programmés **illimités** + récurrents
- ✅ Répondeur **avancé** :
  - Messages **personnalisables** avec variables
  - **Filtrage par contact** (feature clé !)
  - Modes multiples (Hors Ligne, Occupé, Réunion, Vacances, Hors Horaires)
  - Planification horaire
  - Réponses conditionnelles
- ✅ Analytics détaillés avec graphiques
- ✅ Support prioritaire

---

## 🔑 DIFFÉRENCES CLÉS GRATUIT vs PREMIUM

### Auto-Like Status
- **Gratuit** : Like **TOUS** les contacts automatiquement
- **Premium** : Like **sélectif** par contact (toggle ON/OFF)

### Répondeur Automatique
- **Gratuit** : 
  - Messages **non modifiables** (par défaut)
  - **TOUS** les contacts reçoivent la réponse
  - Pas de filtrage possible
  
- **Premium** :
  - Messages **personnalisables** avec variables `{nom}`, `{heure}`, etc.
  - **Filtrage par contact** : choisir qui reçoit la réponse
  - Contacts désactivés → notification pour réponse manuelle
  - Groupes de contacts (VIP, Travail, Famille)
  - Messages différents par contact
  - Planification horaire automatique

---

## 📱 FONCTIONNALITÉS DÉTAILLÉES

### 1. Gestion des Status WhatsApp
- Détection automatique des nouveaux status
- Auto-like configurable (emoji par défaut ou par contact)
- Liste complète des status (24h)
- Programmation de status (limite selon plan)
- Historique et statistiques

### 2. Capture View Once
- Détection automatique des messages éphémères
- Sauvegarde silencieuse (images/vidéos)
- Galerie avec métadonnées
- Téléchargement individuel
- Quotas selon plan (3/mois gratuit, illimité premium)

### 3. Messages Supprimés
- Détection automatique des suppressions
- Sauvegarde du contenu original (texte + médias)
- Métadonnées complètes (date envoi/suppression, délai)
- Quotas selon plan (3/mois gratuit, illimité premium)
- Recherche et export (Premium)

### 4. Répondeur Automatique
- **2 modes basiques** (Gratuit) : Hors Ligne (auto) + Occupé (manuel)
- **Modes avancés** (Premium) : Réunion, Vacances, Hors Horaires, Personnalisé
- Messages par défaut (Gratuit) ou personnalisables (Premium)
- **Filtrage par contact** (Premium uniquement)
- Planification horaire (Premium)
- Statistiques d'utilisation

### 5. Analytics (Premium uniquement)
- Graphiques interactifs
- Tendances et patterns
- Rapports téléchargeables (PDF, JSON, CSV)
- Statistiques détaillées par fonctionnalité

---

## 🗄️ STRUCTURE BASE DE DONNÉES (À CRÉER)

### Tables principales
1. **users** : Utilisateurs (email, password_hash, plan, subscription_id, created_at)
2. **subscriptions** : Abonnements Stripe (user_id, stripe_subscription_id, plan, status, current_period_end)
3. **whatsapp_sessions** : Sessions WhatsApp (user_id, session_data, qr_code, status, connected_at)
4. **status_likes** : Status likés (user_id, contact_id, contact_name, emoji_used, liked_at)
5. **view_once_captures** : View Once sauvegardés (user_id, sender_id, sender_name, media_url, media_type, captured_at)
6. **deleted_messages** : Messages supprimés (user_id, sender_id, sender_name, content, media_url, sent_at, deleted_at)
7. **autoresponder_config** : Config répondeur (user_id, mode, message, enabled, filter_contacts)
8. **autoresponder_contacts** : Filtrage contacts (user_id, contact_id, contact_name, enabled, custom_message)
9. **scheduled_statuses** : Status programmés (user_id, media_url, caption, scheduled_at, published_at, status)
10. **quotas** : Quotas utilisateurs (user_id, view_once_count, deleted_messages_count, scheduled_statuses_count, reset_date)

---

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1 : Infrastructure Backend ✅
- [ ] Créer structure Node.js + Express
- [ ] Configurer variables d'environnement
- [ ] Setup Redis (cache + queues)
- [ ] Configuration CORS et sécurité

### Phase 2 : Base de Données ✅
- [ ] Créer schéma Supabase complet
- [ ] Migrations et relations
- [ ] Indexes pour performances
- [ ] RLS (Row Level Security) policies

### Phase 3 : Authentification ✅
- [ ] Intégration Supabase Auth
- [ ] JWT middleware
- [ ] Routes login/register/logout
- [ ] Protection routes API

### Phase 4 : Intégration WhatsApp ✅
- [ ] Setup @whiskeysockets/baileys
- [ ] Gestion QR code
- [ ] Sauvegarde sessions
- [ ] Reconnexion automatique
- [ ] Webhooks événements WhatsApp

### Phase 5 : Fonctionnalités Core ✅
- [ ] Auto-like status (global + sélectif)
- [ ] Capture View Once
- [ ] Capture messages supprimés
- [ ] Programmation status
- [ ] Répondeur automatique (basique + avancé)

### Phase 6 : Paiements Stripe ✅
- [ ] Intégration Stripe
- [ ] Webhooks abonnements
- [ ] Gestion plans (Gratuit/Premium)
- [ ] Portail client Stripe
- [ ] Factures et historique

### Phase 7 : Frontend ↔ Backend ✅
- [ ] Remplacer mocks par API calls
- [ ] Gestion état avec React Query
- [ ] Authentification frontend
- [ ] Gestion erreurs et loading states

### Phase 8 : Optimisations ✅
- [ ] Cache Redis
- [ ] Queues pour tâches lourdes
- [ ] Upload médias (Cloudinary/S3)
- [ ] CDN pour assets
- [ ] Monitoring et logs

---

## 📊 ÉTAT ACTUEL DU PROJET

### ✅ Déjà fait
- Frontend UI complet (toutes les pages)
- Design system shadcn/ui
- Routing React Router
- Structure composants
- Mockups et données de test

### ❌ À faire
- Backend complet (0%)
- Base de données (0%)
- Authentification réelle (0%)
- Intégration WhatsApp (0%)
- Fonctionnalités backend (0%)
- Paiements Stripe (0%)
- Connexion Frontend ↔ Backend (0%)

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES

1. **Créer la structure backend** (dossiers, fichiers de base)
2. **Définir le schéma de base de données** Supabase
3. **Implémenter l'authentification** (base pour tout le reste)
4. **Intégrer WhatsApp** (fonctionnalité principale)
5. **Développer les features core** une par une
6. **Connecter le frontend** progressivement

---

## ⚠️ POINTS D'ATTENTION

1. **WhatsApp TOS** : Vérifier conformité avec les conditions d'utilisation WhatsApp
2. **Rate Limiting** : Implémenter pour éviter le spam
3. **Sécurité** : Chiffrement des données sensibles, validation inputs
4. **Scalabilité** : Architecture prête pour croissance
5. **Backup** : Sauvegarde régulière des données utilisateurs
6. **RGPD** : Conformité européenne (export données, suppression compte)

---

**Date de création** : 2025-01-15
**Version** : 1.0.0

