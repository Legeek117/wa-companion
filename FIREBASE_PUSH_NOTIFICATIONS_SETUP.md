# Configuration des Notifications Push avec Firebase

Ce guide explique comment configurer les notifications push pour votre PWA AMDA.

## Prérequis

1. Un projet Firebase configuré
2. Les clés Firebase déjà configurées dans le code

## Étapes de Configuration

### 1. Obtenir la VAPID Key (Frontend)

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet `amda-dcf4a`
3. Allez dans **Project Settings** > **Cloud Messaging**
4. Dans la section **Web Push certificates**, cliquez sur **Generate key pair** si vous n'en avez pas encore
5. Copiez la **Key pair** (c'est votre VAPID key)
6. Ajoutez-la dans votre fichier `.env` frontend :
   ```
   VITE_FIREBASE_VAPID_KEY=votre-vapid-key-ici
   ```

### 2. Obtenir le Service Account (Backend)

1. Dans Firebase Console, allez dans **Project Settings** > **Service Accounts**
2. Cliquez sur **Generate new private key**
3. Téléchargez le fichier JSON
4. Vous avez deux options :

   **Option A : Variable d'environnement (recommandé)**
   - Encodez le contenu du fichier JSON en base64 ou stockez-le comme string JSON
   - Ajoutez-le dans votre fichier `.env` backend :
     ```
     FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"amda-dcf4a",...}
     ```

   **Option B : Fichier local (développement uniquement)**
   - Placez le fichier dans `backend/firebase-service-account.json`
   - Modifiez `backend/src/services/notifications.service.ts` pour charger depuis le fichier

### 3. Exécuter le schéma SQL

Exécutez le schéma SQL mis à jour dans Supabase pour créer les tables :
- `fcm_tokens` : Stocke les tokens FCM des utilisateurs
- `notification_settings` : Stocke les préférences de notifications

```sql
-- Voir backend/supabase/schema.sql pour les tables complètes
```

### 4. Installer les dépendances

**Frontend :**
```bash
npm install firebase
```

**Backend :**
```bash
cd backend
npm install firebase-admin
```

### 5. Vérifier le Service Worker

Le service worker Firebase (`public/firebase-messaging-sw.js`) doit être accessible à la racine de votre site. Vérifiez que :
- Le fichier est bien dans le dossier `public/`
- Il est accessible via `https://votre-domaine.com/firebase-messaging-sw.js`

### 6. Tester les Notifications

1. Connectez-vous à votre application
2. Les notifications push seront automatiquement initialisées
3. Testez en :
   - Capturant un View Once (`.vv`)
   - Likant un status
   - Récupérant un message supprimé

## Fonctionnalités

Les notifications push sont envoyées automatiquement pour :
- ✅ **View Once capturé** : Quand un View Once est capturé avec `.vv`
- ✅ **Status liké** : Quand un status est automatiquement liké
- ✅ **Message supprimé récupéré** : Quand un message supprimé est capturé

## Paramètres de Notifications

Les utilisateurs peuvent configurer leurs préférences de notifications dans les **Paramètres** :
- Activer/désactiver toutes les notifications
- Activer/désactiver les notifications View Once
- Activer/désactiver les notifications Status Liked
- Activer/désactiver les notifications Deleted Messages

## Dépannage

### Les notifications ne s'affichent pas

1. Vérifiez que la permission de notification est accordée dans le navigateur
2. Vérifiez que le service worker Firebase est bien enregistré
3. Vérifiez les logs du navigateur pour les erreurs
4. Vérifiez que `FIREBASE_SERVICE_ACCOUNT` est bien configuré dans le backend

### Erreur "Firebase Admin not initialized"

1. Vérifiez que `FIREBASE_SERVICE_ACCOUNT` est dans votre `.env` backend
2. Vérifiez que le JSON est valide
3. Vérifiez les logs du serveur pour plus de détails

### Les notifications ne s'affichent que quand l'app est ouverte

C'est normal ! Les notifications en arrière-plan sont gérées par le service worker. Vérifiez que :
- Le service worker est bien enregistré
- Le fichier `firebase-messaging-sw.js` est accessible
- Les permissions de notification sont accordées

## Support

Pour plus d'aide, consultez la [documentation Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging).

