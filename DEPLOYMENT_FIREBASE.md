# Guide de Déploiement avec Firebase

Ce guide vous explique comment redéployer votre application après l'implémentation de Firebase pour les notifications push.

## 📋 Prérequis

1. ✅ Projet Firebase créé (`amda-dcf4a`)
2. ✅ Configuration Firebase déjà dans le code
3. ✅ Comptes Netlify et Render actifs

## 🔑 Étape 1 : Obtenir les clés Firebase

### 1.1 VAPID Key (Frontend)

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet `amda-dcf4a`
3. Allez dans **Project Settings** (⚙️) > **Cloud Messaging**
4. Dans la section **Web Push certificates** :
   - Si vous n'avez pas de clé, cliquez sur **Generate key pair**
   - Copiez la **Key pair** générée (c'est votre VAPID key)
   - Exemple : `BEl...xyz` (longue chaîne de caractères)

### 1.2 Service Account (Backend)

1. Dans Firebase Console, allez dans **Project Settings** > **Service Accounts**
2. Cliquez sur **Generate new private key**
3. Téléchargez le fichier JSON (ex: `amda-dcf4a-firebase-adminsdk-xxxxx.json`)
4. **Option A - Variable d'environnement (recommandé pour Render)** :
   - Ouvrez le fichier JSON
   - Copiez tout le contenu
   - Vous devrez l'ajouter comme variable d'environnement sur Render (voir étape 3)

## 🏗️ Étape 2 : Installation des dépendances

### 2.1 Frontend

```bash
# Dans le répertoire racine
npm install
```

Cela installera `firebase` qui a été ajouté au `package.json`.

### 2.2 Backend

```bash
# Dans le répertoire backend
cd backend
npm install
```

Cela installera `firebase-admin` qui a été ajouté au `package.json`.

## 🗄️ Étape 3 : Mise à jour de la base de données

### 3.1 Exécuter le schéma SQL mis à jour

1. Allez sur votre projet Supabase
2. Ouvrez l'éditeur SQL
3. Exécutez les nouvelles tables pour les notifications :

```sql
-- Table FCM Tokens
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own FCM tokens" ON fcm_tokens;
CREATE POLICY "Users can manage own FCM tokens"
  ON fcm_tokens FOR ALL
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_fcm_tokens_updated_at ON fcm_tokens;
CREATE TRIGGER update_fcm_tokens_updated_at BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT TRUE,
  view_once BOOLEAN DEFAULT TRUE,
  status_liked BOOLEAN DEFAULT TRUE,
  deleted_message BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notification settings" ON notification_settings;
CREATE POLICY "Users can manage own notification settings"
  ON notification_settings FOR ALL
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Note** : Si vous avez déjà exécuté le schéma complet (`backend/supabase/schema.sql`), ces tables devraient déjà exister.

## 🌐 Étape 4 : Configuration des variables d'environnement

### 4.1 Frontend (Netlify)

1. Allez sur votre dashboard Netlify
2. Sélectionnez votre site
3. Allez dans **Site settings** > **Environment variables**
4. Ajoutez/modifiez :

```
VITE_FIREBASE_VAPID_KEY=votre-vapid-key-ici
VITE_API_URL=https://amda-backend-3aji.onrender.com
```

### 4.2 Backend (Render)

1. Allez sur votre dashboard Render
2. Sélectionnez votre service `amda-backend`
3. Allez dans **Environment**
4. Ajoutez/modifiez :

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"amda-dcf4a","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Important** : 
- Copiez TOUT le contenu du fichier JSON du Service Account
- Collez-le comme une seule ligne dans la variable d'environnement
- Assurez-vous que les guillemets sont correctement échappés

**Alternative** : Si Render a des problèmes avec le JSON multiligne, vous pouvez :
1. Encoder le JSON en base64
2. Modifier `backend/src/services/notifications.service.ts` pour décoder le base64

## 🚀 Étape 5 : Déploiement

### 5.1 Frontend (Netlify)

1. **Commit et push vos changements** :
   ```bash
   git add .
   git commit -m "Add Firebase push notifications and fix autoresponder/config error"
   git push origin main
   ```

2. **Netlify déploiera automatiquement** si vous avez activé le déploiement automatique

3. **Ou déclenchez un déploiement manuel** :
   - Allez sur Netlify Dashboard
   - Cliquez sur **Trigger deploy** > **Deploy site**

4. **Vérifiez le build** :
   - Le build devrait réussir avec les nouvelles dépendances Firebase
   - Vérifiez les logs pour confirmer

### 5.2 Backend (Render)

1. **Commit et push vos changements** :
   ```bash
   git add .
   git commit -m "Add Firebase Admin SDK and fix autoresponder table name"
   git push origin main
   ```

2. **Render déploiera automatiquement** si connecté à votre repo GitHub

3. **Vérifiez le déploiement** :
   - Allez sur Render Dashboard
   - Vérifiez les logs de build
   - Assurez-vous que `firebase-admin` s'installe correctement
   - Vérifiez que le serveur démarre sans erreur

## ✅ Étape 6 : Vérification

### 6.1 Vérifier le frontend

1. Visitez votre site Netlify
2. Connectez-vous
3. Ouvrez la console du navigateur (F12)
4. Vérifiez qu'il n'y a pas d'erreurs Firebase
5. Les notifications push devraient s'initialiser automatiquement

### 6.2 Vérifier le backend

1. Vérifiez les logs Render
2. Testez un endpoint :
   ```bash
   curl https://amda-backend-3aji.onrender.com/health
   ```
3. Vérifiez que Firebase Admin s'initialise (dans les logs) :
   ```
   [NotificationsService] Firebase Admin initialized successfully
   ```

### 6.3 Tester les notifications

1. Connectez votre WhatsApp
2. Testez la capture d'un View Once (`.vv`)
3. Vous devriez recevoir une notification push
4. Testez le like automatique d'un status
5. Testez la récupération d'un message supprimé

## 🐛 Dépannage

### Erreur : "Firebase Admin not initialized"

**Cause** : La variable `FIREBASE_SERVICE_ACCOUNT` n'est pas correctement configurée.

**Solution** :
1. Vérifiez que le JSON est valide
2. Vérifiez que tous les guillemets sont correctement échappés
3. Essayez d'encoder en base64 si nécessaire

### Erreur : "VAPID key not found"

**Cause** : La variable `VITE_FIREBASE_VAPID_KEY` n'est pas configurée sur Netlify.

**Solution** :
1. Vérifiez que la variable est bien ajoutée sur Netlify
2. Redéployez après avoir ajouté la variable
3. Vérifiez que le nom de la variable est exactement `VITE_FIREBASE_VAPID_KEY`

### Erreur 404 sur Netlify après rechargement

**Cause** : La redirection SPA n'est pas correctement configurée.

**Solution** :
1. Vérifiez que `netlify.toml` contient bien la redirection avec `force = true`
2. Redéployez sur Netlify
3. Vérifiez que le fichier `netlify.toml` est bien dans le repo

### Les notifications ne s'affichent pas

**Vérifications** :
1. ✅ Permission de notification accordée dans le navigateur
2. ✅ Service worker Firebase enregistré (vérifier dans Application > Service Workers)
3. ✅ Token FCM sauvegardé (vérifier dans la base de données `fcm_tokens`)
4. ✅ Firebase Admin initialisé (vérifier les logs backend)
5. ✅ Paramètres de notifications activés (vérifier dans la table `notification_settings`)

## 📝 Checklist de déploiement

- [ ] VAPID Key obtenue depuis Firebase Console
- [ ] Service Account JSON téléchargé
- [ ] Dépendances installées (`npm install` frontend et backend)
- [ ] Tables SQL créées dans Supabase
- [ ] Variable `VITE_FIREBASE_VAPID_KEY` ajoutée sur Netlify
- [ ] Variable `FIREBASE_SERVICE_ACCOUNT` ajoutée sur Render
- [ ] Changements commités et pushés
- [ ] Frontend déployé sur Netlify
- [ ] Backend déployé sur Render
- [ ] Builds réussis sans erreur
- [ ] Notifications push testées et fonctionnelles

## 🎉 C'est fait !

Votre application est maintenant déployée avec les notifications push Firebase. Les utilisateurs recevront des notifications pour :
- ✅ View Once capturé
- ✅ Status liké automatiquement
- ✅ Message supprimé récupéré

