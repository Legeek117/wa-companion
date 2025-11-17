# 🔴 Configuration Redis en Production - Guide Complet

## 📋 Options pour Redis en Production

### Option 1 : Redis sur Render (Recommandé) ⭐

Render propose un service Redis managé très simple à configurer.

#### Étape 1 : Créer un Service Redis sur Render

**IMPORTANT** : Sur Render, Redis s'appelle **"Key Value"** dans le menu !

1. Allez sur [render.com](https://render.com)
2. Cliquez sur **"New +"** → **"Key Value"** ⚠️ (pas "Redis", mais "Key Value")
3. Configurez :
   - **Name** : `amda-redis` (ou votre nom)
   - **Plan** : **Free** (pour commencer) ou **Starter** ($10/mois)
   - **Region** : Choisissez la même région que votre backend
4. Cliquez sur **"Create Key Value Store"**

**Note** : "Key Value" = Redis sur Render. C'est juste le nom qu'ils utilisent dans l'interface.

#### Étape 2 : Récupérer les Variables d'Environnement

Une fois créé, Render affiche automatiquement :
- **Internal Redis URL** : `redis://red-xxxxx:6379`
- **External Redis URL** : `redis://red-xxxxx.render.com:6379`
- **Password** : (généré automatiquement)

#### Étape 3 : Configurer dans votre Backend Render

1. Allez dans votre service **Backend** sur Render
2. Cliquez sur **"Environment"**
3. Ajoutez ces variables :

```env
REDIS_URL=redis://red-xxxxx.render.com:6379
REDIS_HOST=red-xxxxx.render.com
REDIS_PORT=6379
REDIS_PASSWORD=votre-password-render
```

**OU** si vous utilisez l'URL complète avec mot de passe :

```env
REDIS_URL=redis://:votre-password@red-xxxxx.render.com:6379
REDIS_HOST=red-xxxxx.render.com
REDIS_PORT=6379
REDIS_PASSWORD=votre-password
```

---

### Option 2 : Redis Cloud (Upstash) - Gratuit ⭐⭐

Upstash offre un Redis gratuit avec 10,000 commandes/jour.

#### Étape 1 : Créer un Compte

1. Allez sur [upstash.com](https://upstash.com)
2. Créez un compte gratuit
3. Créez une nouvelle base Redis

#### Étape 2 : Récupérer les Credentials

Upstash vous donne :
- **UPSTASH_REDIS_REST_URL** : `https://xxxxx.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN** : `xxxxx`

**Note** : Upstash utilise une API REST, pas un socket Redis classique. Il faudrait adapter le code pour utiliser leur SDK.

#### Étape 3 : Configuration Alternative (Redis Standard)

Si vous voulez un Redis standard, Upstash propose aussi :
- **Endpoint** : `xxxxx.upstash.io:6379`
- **Password** : (généré automatiquement)

```env
REDIS_URL=redis://default:votre-password@xxxxx.upstash.io:6379
REDIS_HOST=xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=votre-password
```

---

### Option 3 : Redis Cloud (Redis Labs) - Gratuit ⭐⭐⭐

Redis Labs offre un Redis gratuit avec 30MB.

#### Étape 1 : Créer un Compte

1. Allez sur [redis.com/cloud](https://redis.com/try-free/)
2. Créez un compte gratuit
3. Créez une nouvelle base de données

#### Étape 2 : Configuration

Redis Cloud vous donne :
- **Public endpoint** : `redis-xxxxx.cloud.redislabs.com:xxxxx`
- **Password** : (généré automatiquement)

```env
REDIS_URL=redis://default:votre-password@redis-xxxxx.cloud.redislabs.com:xxxxx
REDIS_HOST=redis-xxxxx.cloud.redislabs.com
REDIS_PORT=xxxxx
REDIS_PASSWORD=votre-password
```

---

### Option 4 : Railway Redis - Gratuit ⭐⭐

Railway propose aussi un Redis gratuit.

#### Étape 1 : Créer un Service Redis

1. Allez sur [railway.app](https://railway.app)
2. Créez un nouveau projet
3. Ajoutez un service **Redis**

#### Étape 2 : Configuration

Railway génère automatiquement :
- **REDIS_URL** : `redis://default:votre-password@containers-us-west-xxx.railway.app:xxxxx`

```env
REDIS_URL=redis://default:votre-password@containers-us-west-xxx.railway.app:xxxxx
REDIS_HOST=containers-us-west-xxx.railway.app
REDIS_PORT=xxxxx
REDIS_PASSWORD=votre-password
```

---

## 🔧 Configuration dans le Code

Votre code actuel dans `backend/src/config/redis.ts` supporte déjà ces formats :

```typescript
// Format 1 : URL complète avec mot de passe
REDIS_URL=redis://:password@host:6379

// Format 2 : URL simple + variables séparées
REDIS_URL=redis://host:6379
REDIS_PASSWORD=password

// Format 3 : Variables séparées (recommandé)
REDIS_HOST=host
REDIS_PORT=6379
REDIS_PASSWORD=password
```

---

## 📝 Exemple de Configuration Complète sur Render

### Backend Service (.env sur Render)

```env
# Redis (Service Render)
REDIS_URL=redis://red-xxxxx.render.com:6379
REDIS_HOST=red-xxxxx.render.com
REDIS_PORT=6379
REDIS_PASSWORD=votre-password-render

# Cloudinary
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret

# Autres variables...
NODE_ENV=production
PORT=3000
# etc...
```

---

## 🧪 Tester la Connexion Redis

### Test Manuel

Créez un fichier `backend/scripts/test-redis.ts` :

```typescript
import { getRedisClient } from '../src/config/redis';

async function testRedis() {
  const client = await getRedisClient();
  if (!client) {
    console.error('❌ Redis not connected');
    process.exit(1);
  }

  try {
    // Test SET
    await client.set('test', 'hello');
    console.log('✅ SET test passed');

    // Test GET
    const value = await client.get('test');
    console.log('✅ GET test passed:', value);

    // Test DELETE
    await client.del('test');
    console.log('✅ DELETE test passed');

    console.log('✅ All Redis tests passed!');
    await client.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
```

Exécutez :
```bash
npm run dev
# ou
ts-node scripts/test-redis.ts
```

---

## 🚨 Dépannage

### Erreur : "Redis connection failed"

**Solutions** :
1. Vérifiez que Redis est démarré (si local)
2. Vérifiez les variables d'environnement
3. Vérifiez que le firewall autorise la connexion
4. Testez la connexion avec `redis-cli` :

```bash
redis-cli -h votre-host -p 6379 -a votre-password ping
```

### Erreur : "Redis not available, continuing without Redis"

**Causes possibles** :
- Redis n'est pas configuré
- Variables d'environnement incorrectes
- Redis n'est pas accessible depuis votre serveur

**Solution** : Vérifiez les logs au démarrage du serveur. Le code continue sans Redis, mais le pairing code ne fonctionnera pas correctement.

### Erreur : "Connection timeout"

**Solutions** :
1. Vérifiez que vous utilisez l'URL **externe** (pas interne) si vous êtes hors de Render
2. Vérifiez que le port est correct
3. Vérifiez que le firewall autorise la connexion

---

## 💡 Recommandations

### Pour le Développement Local

```env
# .env local
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Vide si pas de mot de passe
```

Installez Redis localement :
- **Windows** : [Memurai](https://www.memurai.com/) ou WSL
- **Mac** : `brew install redis`
- **Linux** : `sudo apt-get install redis-server`

### Pour la Production

**Recommandation** : Utilisez **Render Redis** (Option 1) car :
- ✅ Intégré avec Render
- ✅ Même réseau interne (plus rapide)
- ✅ Gratuit pour commencer
- ✅ Facile à configurer

**Alternative** : **Upstash** si vous voulez un service externe gratuit.

---

## 📊 Comparaison des Options

| Service | Gratuit | Limite Gratuite | Facilité | Recommandation |
|---------|---------|-----------------|----------|----------------|
| **Render Redis** | ✅ | 25MB | ⭐⭐⭐⭐⭐ | ✅ **MEILLEUR** |
| **Upstash** | ✅ | 10K cmd/jour | ⭐⭐⭐⭐ | ✅ Bon |
| **Redis Cloud** | ✅ | 30MB | ⭐⭐⭐ | ✅ Bon |
| **Railway Redis** | ✅ | Illimité* | ⭐⭐⭐⭐ | ✅ Bon |

*Railway : Gratuit avec crédits mensuels

---

## ✅ Checklist de Configuration

- [ ] Service Redis créé (Render/Upstash/etc.)
- [ ] Variables d'environnement copiées
- [ ] Variables ajoutées dans Render (section Environment)
- [ ] Backend redéployé
- [ ] Test de connexion réussi
- [ ] Logs vérifiés : "Redis connected"
- [ ] Test pairing code effectué

---

## 🎯 Configuration Rapide Render (5 minutes)

1. **Créer Redis** : Render Dashboard → New + → **Key Value** → Create
   - ⚠️ **Important** : C'est "Key Value" dans le menu, pas "Redis" !
2. **Copier les variables** : Dans la page Key Value, copiez l'URL et le password
3. **Ajouter au Backend** : Backend → Environment → Add Variable
4. **Redéployer** : Le backend redéploiera automatiquement
5. **Vérifier** : Regardez les logs, vous devriez voir "Redis connected"

---

**Questions ?** N'hésitez pas à demander de l'aide pour la configuration !

