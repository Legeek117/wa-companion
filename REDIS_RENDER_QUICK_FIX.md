# 🔴 Redis sur Render - Solution Rapide

## ⚠️ Problème : Pas d'option "Redis" dans le menu

Sur Render, Redis s'appelle **"Key Value"** dans le menu "New +" !

## ✅ Solution : Utiliser "Key Value"

### Étape 1 : Créer le Service

1. Allez sur [render.com](https://render.com)
2. Cliquez sur **"New +"** (bouton en haut à droite)
3. Dans le menu déroulant, cliquez sur **"Key Value"** (pas "Redis")
   - C'est l'option avec l'icône de deux rectangles empilés
4. Configurez :
   - **Name** : `amda-redis`
   - **Plan** : **Free** (pour commencer)
   - **Region** : Même région que votre backend
5. Cliquez sur **"Create Key Value Store"**

### Étape 2 : Récupérer les Variables

Une fois créé, Render affiche :
- **Internal Redis URL** : `redis://red-xxxxx:6379`
- **External Redis URL** : `redis://red-xxxxx.render.com:6379`
- **Password** : (généré automatiquement)

### Étape 3 : Configurer dans le Backend

1. Allez dans votre service **Backend** sur Render
2. Cliquez sur **"Environment"** (dans le menu de gauche)
3. Cliquez sur **"Add Environment Variable"**
4. Ajoutez ces 4 variables :

```
REDIS_URL=redis://red-xxxxx.render.com:6379
REDIS_HOST=red-xxxxx.render.com
REDIS_PORT=6379
REDIS_PASSWORD=votre-password-render
```

**Remplacez** :
- `red-xxxxx` par le nom réel de votre service Key Value
- `votre-password-render` par le mot de passe affiché

### Étape 4 : Redéployer

Le backend redéploiera automatiquement. Vérifiez les logs !

---

## 🎯 Alternative : Si "Key Value" n'est pas disponible

Si vous ne voyez pas "Key Value" non plus, voici les alternatives :

### Option A : Upstash (Gratuit, 2 minutes)

1. Allez sur [upstash.com](https://upstash.com)
2. Créez un compte gratuit
3. Créez une nouvelle base Redis
4. Copiez l'**Endpoint** et le **Password**
5. Configurez dans Render :

```env
REDIS_URL=redis://default:votre-password@endpoint.upstash.io:6379
REDIS_HOST=endpoint.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=votre-password
```

### Option B : Redis Cloud (Gratuit, 2 minutes)

1. Allez sur [redis.com/try-free](https://redis.com/try-free/)
2. Créez un compte gratuit
3. Créez une nouvelle base de données
4. Copiez l'**Endpoint** et le **Password**
5. Configurez dans Render :

```env
REDIS_URL=redis://default:votre-password@redis-xxxxx.cloud.redislabs.com:xxxxx
REDIS_HOST=redis-xxxxx.cloud.redislabs.com
REDIS_PORT=xxxxx
REDIS_PASSWORD=votre-password
```

---

## 📸 Où trouver "Key Value" dans le menu

Dans le menu "New +", vous devriez voir :

```
┌─────────────────────┐
│ Static Site         │
│ Web Service         │
│ Private Service     │
│ Background Worker   │
│ Cron Job            │
├─────────────────────┤
│ Postgres            │
│ Key Value    ← ICI! │
├─────────────────────┤
│ Project             │
│ Blueprint           │
└─────────────────────┘
```

"Key Value" est dans la section des bases de données, juste après "Postgres".

---

## ❓ Questions Fréquentes

### Q: Pourquoi "Key Value" et pas "Redis" ?
**R:** C'est juste le nom que Render utilise dans l'interface. Techniquement, c'est bien Redis.

### Q: "Key Value" n'est pas disponible dans mon plan ?
**R:** Le plan Free devrait l'inclure. Si ce n'est pas le cas, utilisez Upstash (gratuit).

### Q: Puis-je utiliser un Redis externe ?
**R:** Oui ! Upstash ou Redis Cloud fonctionnent très bien avec Render.

---

## ✅ Checklist

- [ ] J'ai cliqué sur "New +"
- [ ] J'ai trouvé "Key Value" dans le menu
- [ ] J'ai créé le service Key Value
- [ ] J'ai copié l'URL et le password
- [ ] J'ai ajouté les 4 variables dans le Backend
- [ ] Le backend a redéployé
- [ ] Les logs montrent "Redis connected"

---

**Besoin d'aide ?** Dites-moi où vous en êtes et je vous guide étape par étape !

