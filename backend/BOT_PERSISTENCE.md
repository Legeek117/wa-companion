# 🤖 Persistance du Bot WhatsApp

## ✅ Le bot fonctionne déjà indépendamment du navigateur

Le bot WhatsApp fonctionne **côté serveur**, ce qui signifie qu'il continue de fonctionner même si :
- ✅ L'utilisateur ferme son navigateur
- ✅ L'utilisateur ferme l'onglet
- ✅ L'utilisateur se déconnecte du site web
- ✅ L'utilisateur éteint son ordinateur
- ✅ Le serveur redémarre (reconnexion automatique)

## 🔐 Configuration JWT actuelle

Votre configuration actuelle dans `.env` :

```env
JWT_EXPIRES_IN=30d          # Token expire après 30 jours
JWT_REFRESH_EXPIRES_IN=90d  # Refresh token expire après 90 jours
```

Cela signifie que :
- ✅ L'utilisateur reste connecté **30 jours** sans avoir à se reconnecter
- ✅ Le refresh token permet de renouveler le token automatiquement pendant **90 jours**
- ✅ Le bot continue de fonctionner même si l'utilisateur ne visite pas le site pendant 30 jours

## 🔄 Comment ça fonctionne

### 1. Connexion WhatsApp
- L'utilisateur se connecte une fois via QR code ou code de couplage
- Les credentials sont sauvegardés **côté serveur** dans `sessions/{userId}/`
- Le bot reste connecté **indépendamment du navigateur**

### 2. Reconnexion automatique
- Au démarrage du serveur, le bot se reconnecte automatiquement si des credentials existent
- Le bot vérifie s'il est déjà connecté avant de reconnecter (évite les coupures)
- Les listeners de messages sont configurés automatiquement

### 3. Persistance
- Le bot continue de recevoir et traiter les messages même si l'utilisateur n'est pas sur le site
- Les messages sont sauvegardés dans la base de données
- L'utilisateur peut revenir plus tard et voir tous les messages capturés

## 📊 Fonctionnalités actives en permanence

Même si l'utilisateur n'est pas sur le site, le bot continue de :
- ✅ Recevoir tous les messages entrants
- ✅ Capturer les messages View Once
- ✅ Détecter les messages supprimés
- ✅ Gérer les statuts (auto-like si configuré)
- ✅ Répondre automatiquement (autoresponder si configuré)

## 🔧 Vérification

Pour vérifier que le bot fonctionne :

1. **Connectez-vous au site** et connectez WhatsApp
2. **Fermez votre navigateur** complètement
3. **Envoyez-vous un message WhatsApp** depuis un autre appareil
4. **Rouvrez le site** (même après plusieurs jours)
5. **Vérifiez** que le message a été capturé dans la base de données

## ⚙️ Configuration recommandée

Pour une persistance maximale :

```env
# JWT - Durée longue pour éviter les reconnexions fréquentes
JWT_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN=90d

# WhatsApp - Le bot reste connecté en permanence
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_SESSION_TIMEOUT=300000
```

## 🚨 Important

- ⚠️ Le bot fonctionne **côté serveur**, pas côté client
- ⚠️ Si le **serveur redémarre**, le bot se reconnecte automatiquement
- ⚠️ Si le **serveur s'arrête**, le bot s'arrête aussi (mais se reconnecte au redémarrage)
- ⚠️ Le JWT n'affecte **pas** la connexion WhatsApp, seulement l'accès à l'API web

## 📝 Résumé

✅ **Le bot fonctionne déjà en permanence** - il n'est pas lié à la session web de l'utilisateur
✅ **Le JWT est configuré pour 30 jours** - l'utilisateur reste connecté longtemps
✅ **La reconnexion automatique** assure que le bot se reconnecte après un redémarrage du serveur
✅ **Tous les messages sont capturés** même si l'utilisateur n'est pas sur le site

