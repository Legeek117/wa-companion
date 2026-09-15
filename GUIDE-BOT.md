# Guide complet — Application « companion » WhatsApp Bot (partie Discussions)

> Guide destiné à une personne qui veut construire son propre bot WhatsApp avec
> une interface web/mobile de **discussions** (voir et répondre aux conversations
> de son numéro WhatsApp via une autre app).
>
> Ce document décrit l'architecture, le code et les mécanismes utilisés — sans
> aucun secret ni adresse réelle. Toutes les URLs, clés et identifiants sont des
> exemples à adapter (`<VOTRE_DOMAINE>`, `<SECRET_JWT>`, …).

---

## 1. Vue d'ensemble

Le principe : un **backend Node.js** tient la session WhatsApp (via la lib
Baileys) et expose une **API REST + fichiers statiques**. Une **app web/mobile
(Capacitor)** consomme cette API pour afficher la liste des conversations et les
messages, et pour envoyer des réponses. WhatsApp ne se connecte qu'au backend.

```
                  QR / code de couplage
  +-------------+                +----------------------+
  | App mobile  | <------------> | Backend (Node/Baileys) |
  | (Capacitor) |   REST /api    |                       |  <--> WhatsApp
  +-------------+                | PostgreSQL (Prisma)   |        (WebSocket)
                                 +----------------------+
```

Choix structurants :
- **Pas de websocket app → backend** : temps réel par **polling léger** côté
  front (react-query). Plus simple et robuste pour ce cas d'usage.
- Le serveur **reste le seul client WhatsApp** ; chaque utilisateur de l'app a
  son propre compte, sa propre session WhatsApp et ses propres données.

---

## 2. Stack

Backend (`backend/`) :
- Node.js + **Express** (`express ^4.18`)
- **Baileys** (`@whiskeysockets/baileys ^6.7`) — client WhatsApp non officiel
- **Prisma + PostgreSQL** (30 modèles)
- Optional : `cloudinary` (médias), `redis`/`bull` (queues), `node-cron`,
  `jsonwebtoken` + `bcryptjs` (auth), `express-rate-limit`, `helmet`, `cors`,
  `multer` (uploads), `zod`, `qrcode`, `pino`/`winston` (logs)

Frontend (`src/`) :
- **Vite + React 18 + TypeScript**
- **TanStack React Query** (polling + cache + mutations)
- **TailwindCSS + shadcn/ui** (Radix)
- **Capacitor 8** (Android) : `@capacitor/app`, `@capacitor/browser`,
  `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/splash-screen`
- `react-router-dom`, `sonner` (toasts), `lucide-react`, `date-fns`

---

## 3. Moteur WhatsApp (Baileys) — le cœur du backend

### 3.1 Connexion / session / QR

Fichier clé : `backend/src/services/whatsapp.service.ts` (≈ 4 800 lignes).

- La connexion utilise **`useMultiFileAuthState`** : les credentials sont
  persistés sur disque (dossier `sessions/`), ce qui permet de rester connecté
  sans re-scanner le QR.
- **Génération du QR** : quand on demande un nouveau QR, on **vide** le dossier
  de session (déconnexion propre du numéro précédent), on retire aussi l'éventuel
  backup distant, puis on renvoie le QR en base64. Un QR déjà généré il y a
  moins de 5 min est renvoyé tel quel (pas de re-génération inutile).
- **Code de couplage (pairing code)** : alternative au QR pour les comptes
  vérifiés (API Baileys `requestPairingCode`).
- Statut exposé : `connected` / `connecting` / `disconnected`, avec
  `lastSeen` (timestamp du dernier message reçu).
- **Reconnexion automatique** : backoff exponentiel 5 s → 5 min, max 10 essais,
  30 s de cooldown, puis on s'arrête proprement (l'utilisateur relance manuellement
  via l'API). Vérification que le socket Baileys est réellement ouvert
  (`isOpen` du WebSocket interne de Baileys 6.x) avant de considérer la session
  comme vivante.

Astuce d'une session avec **plusieurs comptes utilisateurs** : chaque compte a
`user_id` + son propre socket/session, géré dans un dictionnaire en mémoire
(`sockets.set(userId, …)`). Tout tourne en parallèle avec un petit décalage
(~1,5 s) pour éviter de créer les connexions en même temps.

### 3.2 Normalisation des numéros (JID)

Une fonction `canonifyContactJid()` normalise les identifiants WhatsApp :
- ajoute le suffixe `@s.whatsapp.net` si absent,
- retire les extensions de device (`…:12@…`) et les variantes `lid`,
- laisse passer les groupes (`@g.us`), broadcasts et newsletters.

**Toujours stocker les JID canonifiés en base** (clé d'unicité partout).

### 3.3 Écoute des événements (`setupMessageListeners`)

| Événement Baileys | Action |
|---|---|
| `messages.upsert` | Ingestion d'un message reçu/envoyé (voir §4). Met à jour `lastSeen`, gère le statut, upsert du contact, stocke le message, déclenche l'autoresponder le cas échéant. |
| `messaging-history.set` | Même ingestion pour la synchro d'historique (mode hors-ligne). |
| `contacts.upsert` / `chats.upsert` | Met à jour le cache contacts + la table contacts. |
| `presence.update` | Détection d'un statut de présence spécial. |
| `messages.delete` | Suppression côté WhatsApp → sauvegarde en « messages supprimés ». |
| `messages.update` | Filtre les **révocations** (stub `REVOKE`) → même traitement que la suppression. |

---

## 4. Pipeline d'un message reçu

1. **Baileys** reçoit un message → `messages.upsert`.
2. On **ignore les groupes/broadcasts/newsletters** (sauf si la capture globale
   de contacts est activée : réglage administrateur).
3. **`upsertContact`** : garantit l'existence du contact (clé `user_id + contact_id`).
4. **`storeMessage` (message.service)** → écrit dans `whatsapp_messages`
   (upsert sur `user_id + message_id` pour être idempotent).
5. Si le message contient **du média** → pipeline médias (`processAndUploadMedia`, §6) :
   on récupère le buffer WhatsApp, on le stocke, puis `media_url` est mise à jour.
6. Si le message est une **vue unique** répondant à la commande (ex: `.vv`) →
   capture chiffrée (voir §9).
7. **Réponse** : le front react-query rappelle périodiquement les endpoints de
   conversation → les nouveaux messages apparaissent (aucun websocket nécessaire).

### Structure d'un message stocké (extraits)

```
userId, messageId (unique ensemble)
from_me            // true si envoyé par le bot
contactId          // JID canonifié de l'interlocuteur
content            // texte (ou descriptif du média)
media_url, media_type // image|video|audio|document|sticker|...
from, to, timestamp
quoted_message_id / quoted_content
```

Les conversations du front sont dérivées par **agrégation** : `GROUP BY contact`
+ dernière valeur du dernier message (`DISTINCT ON (contact_id) … ORDER BY
timestamp DESC`). C'est le backend qui construit la liste des conversations
toujours à jour, pas le front.

---

## 5. Modèle de données (extraits essentiels)

- `User` — compte de l'app (email, hash bcrypt, plan, clés E2E).
- `Admin` — comptes administrateurs (login séparé, token séparé).
- `WhatsappSession` — état de session/socket par utilisateur.
- `Contact` — carnet de contacts (unique `userId + contactId`), avec `name`
  (nom personnalisé) et `pushName` (nom WhatsApp).
- `WhatsappMessage` — tous les messages reçus/stockés (unique `userId + messageId`,
  index sur `timestamp`).
- `DeletedMessage` — messages supprimés WhatsApp récupérés (avec `sent_at`,
  `deleted_at`, `delay_seconds`).
- `ViewOnceCapture` — captures de messages à lecture unique, **chiffrées**.
- `AutoresponderConfig`/`AutoresponderContact` — réponse automatique.
- `Quota` — compteurs journaliers par fonctionnalité (vue unique, messages
  supprimés, statuts, …).
- `AppVersion` — version publiée de l'app, pour la détection de mise à jour.

---

## 6. Médias : récupération, stockage, URL

### 6.1 Types et detection

`getMediaType()` dans `backend/src/services/media.service.ts` : inspecte le
proto du message Baileys (`audioMessage`, `imageMessage`, `videoMessage`,
`documentMessage`, `stickerMessage`, …) et renvoie `audio`, `image`, `video`,
`document`, `sticker`, etc. + les métadonnées (`mimeType`, `filename`, `size`).

### 6.2 Télécharger depuis WhatsApp

`downloadMediaFromWhatsApp()` : utilise l'API **`downloadMediaMessage`** de
Baileys (gère le chiffrement WhatsApp et stream/mémoire automatiquement).

### 6.3 Nom de fichier et extension (LE point piège à connaître)

```ts
// ex: "audio/ogg; codecs=opus"  ->  il FAUT ignorer les paramètres MIME
const mime = mediaInfo.mimeType.split(';')[0].trim().toLowerCase();
```

- Générer un nom unique : `{userId}_{timestamp}_{aléatoire}.{ext}`.
- **Priorité d'extension** : extension du nom de fichier **original** (pour les
  documents) > extension déduite du **MIME normalisé** > défaut par type
  (image→jpg, vidéo→mp4, audio→ogg, document→bin).
- `getExtensionFromMimeType()` : table MIME→ext (`image/jpeg→jpg`,
  `audio/ogg→ogg`, `audio/opus→opus`, `video/mp4→mp4`, `video/3gpp→3gp`,
  `application/pdf→pdf`, …), fallback `bin`.

⚠️ **Bug rencontré en production** : ne pas nettoyer les paramètres MIME donne
`audio/ogg; codecs=opus → "bin"`. Résultat : des dizaines de notes vocales
stockées en `.bin`, servies en `application/octet-stream`, donc illisibles et
téléchargées comme `.bin`. Deux niveaux de protection ont été ajoutés :

1. **À l'écriture** : normalisation ci-dessus (nouveaux fichiers corrects).
2. **À la lecture** : les montages `express.static` snaiffent les **magic bytes**
   (premiers octets du fichier) comme fallback avant `application/octet-stream` :
   `OggS→audio/ogg`, `ftyp→video/mp4|audio/m4a|mov`, `ID3/0xFFE→audio/mpeg`,
   `%PDF→application/pdf`, `RIFF+WEBP→image/webp`, `0x89504E47→image/png`,
   `FFD8FF→image/jpeg`, `PK→application/zip`, …

   Cela corrige **sans migration** les anciens fichiers déjà stockés en `.bin`.

Un script de migration (`scripts/fix-media-ext.mjs`) propose aussi de renommer
les `.bin` existants (sniffing + rename + `UPDATE` des `media_url` en base).

### 6.4 Stockage

- **Local** (défaut) : répertoire `uploads/<sous-dossier>/…` servis par
  `express.static` sous `/api/media/conversations`, `/api/media/deleted-messages`
  et `/api/media/view-once`. Les URLs renvoient vers ces chemins relatifs.
- **Optionnel Cloudinary** : `uploadMedia()` stocke côté Cloudinary (dossier =
  `sous-dossier/userId`) et renvoie l'URL CDN ; fallback local si l'upload échoue.
- Tous les montages statiques posent les en-têtes CORS +
  `Cross-Origin-Resource-Policy: cross-origin` (indispensable pour charger les
  médias dans une app web/webview) et le bon `Content-Type` par extension
  (+ sniffing ci-dessus).

---

## 7. API REST (sous `/api`)

Auth par **Bearer token** (`protect`), sauf routes publiques. Rate limiting
global + `looseLimiter` pour les pollings fréquents.

- `/api/auth` — register (public), login (public), me, logout, refresh
- `/api/whatsapp` — qr, pairing-code, status, disconnect, reconnect
- `/api/messages` — **conversations** (liste, limit 200), **:contactId**
  (messages d'une conversation, limit 500), profile-picture, **send**
- `/api/status`, `/api/view-once`, `/api/deleted-messages`, `/api/autoresponder`,
  `/api/quota`, `/api/analytics`, `/api/notifications`, `/api/subscription`
- `/api/version` — GET public (dernière version), POST admin (publier une version)
- `/api/e2e` — clés de chiffrement / backup
- `/api/admin` — gestion des utilisateurs/contacts/messages (token admin séparé)
- `/api/media/…` — fichiers statiques (montés **avant** le rate limiter)

### Exemple d'envoi de message

```
POST /api/messages/send
{ contactId: "33XXXXXXXXX@s.whatsapp.net", message: "Bonjour !" }
→ le service génère un id synthétique `outgoing_*`,
  appelle sendMessage de Baileys, puis upsertMessage + upsertContact.
```

Le front affiche le message envoyé immédiatement (accord optimiste) et confirme
via le polling.

---

## 8. Le « temps réel » côté front

Pas de websocket : **react-query fait tourner des `refetchInterval`** sur les
clés de requête :
- conversations : `['discussions','conversations']` → refetch **15 s**
- messages d'une conversation : `['discussions','messages',contactId]` → **10 s**
- aperçu (10 derniers messages) : `['discussions','peek',contactId]`
- statut WhatsApp : `['whatsapp','status']` → 10 s

Avantages : zéro infra temps réel, robuste en coupure réseau, cache/mises à jour
gratuites. La mutation d'envoi **invalide** les clés conversations + messages pour
rafraîchir aussitôt. Un composant `KeepAlive` ping le backend pour ne pas
endormir la session en arrière-plan.

---

## 9. Frontend — la partie Discussions

### 9.1 Page principale `src/pages/Discussions.tsx`

- **Liste des conversations** : avatar (couleur + initiales), nom
  (`resolveContactDisplay` : nom répertoire → pushName → numéro), dernier
  message + horodatage, badge non-lus. Recherche par nom ou chiffres du numéro.
- **Fil de discussion** : bulles (envoyées/reçues), séparateurs de dates
  (« Aujourd'hui », « Hier », jour de la semaine), déduplication par `message_id`,
  affichage des citations (message quoté), médias cliquables → visionneuse.
- **Envoi** : champ texte + bouton ; mutation react-query ; invalidation.
- **État local par appareil** : conversations archivées/muettes/masquées/lues
  (non persistées côté serveur).
- Images de profil : `GET /api/messages/profile-picture/:contactId`
  → Bing/`profilePictureUrl(jid, 'preview')`.

### 9.2 Client API `src/lib/api.ts`

- `API_URL` = `VITE_API_URL` ou URL de prod (nettoyée des `/` finaux).
- Base URL **relative pour le reste** : les `media_url` commençant par
  `/api/…` sont préfixées par `buildMediaUrl()`.
- Token JWT stocké dans `localStorage('auth_token')`, attaché en header
  `Authorization: Bearer`, rafraîchi automatiquement depuis les réponses qui
  renvoient un `token`.
- Tolérance réseau : 3 retries avec backoff exponentiel sur les erreurs de
  réseau et les 429 (rate limit).
- Namespaces exposés : `api.messages.conversations / conversationMessages /
  profilePicture / send`, `api.whatsapp`, `api.deletedMessages`, `api.viewOnce`,
  `api.version`, etc.

### 9.3 Téléchargement des médias (APK) `src/lib/download.ts`

Fonction `saveFileToDownloads(blob, title, mimeType)` — adaptation aux
versions Android :
- **Android ancien** : `WRITE_EXTERNAL_STORAGE` → `Directory.Downloads`.
- **Android 11+** : `Downloads` puis `Share` en repli.
- **iOS** : `Documents`.
- **Web** : lien `<a download>`.

Nom de fichier via une map MIME→extension (mêmes types que le backend, MIME
sans paramètres — ex: `audio/ogg;codecs=opus → .ogg`).

⚠️ Sur webview Android, éviter `window.open()` pour télécharger : préférer
`fetch(media_url)` → `blob` → `saveFileToDownloads`. C'était la cause de
téléchargements `.bin`/inexistants sur l'APK.

### 9.4 Détection de mise à jour (`UpdateGuard`)

Un overlay compare la version publiée en base (`/api/version`) avec la version
installée :
- version installée = `Capacitor App.getInfo()` (`build` → versionCode,
  `version` → versionName) sur natif, sinon valeurs d'environnement de build
  (`VITE_APP_VERSION` / `VITE_APP_VERSION_CODE`).
- Si `versionCode serveur > versionCode installé` → overlay « Nouvelle version
  disponible » + bouton « Mettre à jour » (ouvre l'URL de l'APK via
  `@capacitor/browser`).
- ⚠️ Piège : une vérification **unique au démarrage** peut échouer silencieusement
  (réseau/SSL/cold start) → dans ce cas ne jamais bloquer l'app, **et re-vérifier
  périodiquement (toutes les ~45 s) + au retour de l'app** (événement `resume`).
  Un bouton « Vérifier les mises à jour » dans Réglages permet un contrôle manuel.

---

## 10. Messages supprimés et vues uniques

### 10.1 Messages supprimés

- À la réception d'un `messages.delete` (ou revocation via `messages.update`),
  `handleMessageDeletion()` **persiste d'abord** le message (contenu + média)
  dans `deleted_messages` avant que WhatsApp ne l'efface (cache mémoire de
  dernier recours, indexé par clé de message).
- Quota : `checkDeletedMessagesQuota` / `incrementDeletedMessages` (ex: 3
  captures par jour en plan gratuit).
- API : `GET /api/deleted-messages` (avec `media_url`), `GET /:id`,
  `DELETE /:id`, `/stats`, `/export`.
- Front : page `DeletedMessages.tsx` listant les captures, lecture du média
  (MediaViewer) et **téléchargement natif** via `saveFileToDownloads`.

### 10.2 Vues uniques (View Once)

- Impossible de capturer directement une vue unique depuis 2024 (limitation
  Baileys) → la seule voie fiable : **la commande par citation** (`.vv` ou un
  emoji) : l'utilisateur répond à un message vue unique, le bot capture le média
  à la volée.
- **Chiffrement de bout en bout serveur** : le média est chiffré en
  **AES-256-GCM** (clé aléatoire), la clé est chiffrée avec la clé publique RSA
  (RSA-OAEP-256) de l'utilisateur. Le serveur ne conserve jamais de clair.
- Les octets chiffrés sont servis par `downloadEncryptedMedia` avec les
  en-têtes `X-E2E-IV`, `X-E2E-WRAPPED-KEY`, `X-E2E-MEDIA-TYPE` ; le client
  déchiffre via WebCrypto (clé privée RSA dérivée d'une phrase secrète).
- API : `GET/PUT /api/view-once/command-config`, `GET /api/view-once`,
  `GET /api/view-once/:id/media` (stream chiffré), `DELETE /:id`, `/stats`.

---

## 11. Auth & sécurité (résumé)

- **JWT** (HS256 par défaut) signé avec `JWT_SECRET` (`backend/src/config/env.ts`),
  durée configurable ; refresh token séparé. Passwords en **bcrypt** (10 rounds).
- Rôle **admin** séparé (table `Admin`, login dédié, token dédié) pour les
  actions sensibles (publier une version, gestion utilisateurs).
- **Rate limiting** global + limiter « lâche » sur les endpoints pollés
  (ex: `auth/me`, statuts) pour ne pas bloquer le polling.
- **helmet**, **cors** (liste blanche `ALLOWED_ORIGINS` + `FRONTEND_URL`).
- Ne **jamais** exposer : `JWT_SECRET`, `DATABASE_URL`, clés Cloudinary/Stripe/
  Firebase (variables d'environnement, hors git).

---

## 12. Déploiement (schéma Docker)

- `docker-compose` : services `backend` (Node), `postgres`, `redis`.
- L'entrée du backend exécute `prisma db push`/migrate au démarrage, puis
  `node dist/…`.
- Dossier `sessions/` + `uploads/` sur volume persistant.
- Un reverse-proxy (**nginx**) en frontal : sert l'app web, proxy les `/api`,
  et livre les APK de `/releases/` avec `default_type
  application/vnd.android.package-archive` et `Content-Disposition: attachment`.
- Variables typiques : `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`,
  `ALLOWED_ORIGINS`, `UPLOADS_PATH`, `WHATSAAP_SESSION_PATH`…
- Côté app : `VITE_API_URL` (URL publique de l'API), `VITE_APP_VERSION`,
  `VITE_APP_VERSION_CODE`.

---

## 13. Pièges rencontrés (checklist pour le recopier)

1. [ ] **JID canonifié partout** avant stockage (sinon doublons `@s.whatsapp.net`
      vs `:0@…`).
2. [ ] **MIME sans paramètres** avant toute déduction d'extension
      (`audio/ogg; codecs=opus` → ogg). Fallback + magic bytes à la lecture.
3. [ ] **Idempotence** : upsert `(userId, messageId)` partout (Baileys peut
      redonner un message, historique inclus).
4. [ ] **`messaging-history.set`** : ne pas ignorer les messages « append » sinon
      l'historique hors-ligne disparaît au re-scan du QR.
5. [ ] Révocations : filtrer `messages.update` avec stub `REVOKE`.
6. [ ] Les médias statiques doivent renvoyer `Cross-Origin-Resource-Policy:
      cross-origin` (sinon chargés sur l'app web).
7. [ ] Téléchargement APK : `saveFileToDownloads`, pas `window.open`.
8. [ ] Guard de mise à jour : re-vérification périodique + au `resume`, jamais
      de blocage si l'API ne répond pas.
9. [ ] Reconnexion WhatsApp : backoff + arrêt propre ; vérifier `isOpen` réel
      du socket (pas seulement l'état interne).
10. [ ] Rate limiting « loose » sur les endpoints pollés toutes les 10 s.

---

## 14. Par où commencer (mini-plan pour votre bot)

1. `backend` : Baileys → QR → recevoir des messages → les écrire en base
   (`whatsapp_messages` + `contacts`).
2. `backend` : endpoints `GET /api/messages/conversations` et
   `GET /api/messages/conversations/:contactId`, puis `POST /api/messages/send`.
3. `backend` : médias (`processAndUploadMedia` + montages statiques).
4. `frontend` : `api.ts` (client), hooks de polling, page Discussions.
5. Ajoutez ensuite : messages supprimés, vues uniques, autorépondre, statuts,
   quotas, versionning APK.

Bonne construction !