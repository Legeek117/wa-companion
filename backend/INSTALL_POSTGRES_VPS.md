# 🐘 Installation PostgreSQL sur VPS Ubuntu/Debian

Ce guide installe PostgreSQL localement sur votre serveur VPS pour remplacer Supabase comme base de données.

## Connexion au Serveur

```bash
ssh root@159.223.162.195
```

## Installation PostgreSQL

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Vérifier l'installation
sudo systemctl status postgresql
# Devrait afficher "active (running)"

# Vérifier la version
psql --version
# Devrait afficher: psql (PostgreSQL) 14.x ou supérieur
```

## Configuration de la Base de Données

```bash
# Se connecter à PostgreSQL en tant que superuser
sudo -u postgres psql

# Une fois dans psql, exécuter ces commandes:
```

```sql
-- Créer la base de données
CREATE DATABASE amda;

-- Créer un utilisateur dédié avec mot de passe
CREATE USER amda_user WITH PASSWORD 'VotreMotDePasseSecurise123!';

-- Donner tous les privilèges sur la base amda
GRANT ALL PRIVILEGES ON DATABASE amda TO amda_user;

-- Connecter à la base amda
\c amda

-- Activer l'extension uuid (nécessaire pour Prisma)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Donner les privilèges sur le schéma public
GRANT ALL ON SCHEMA public TO amda_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO amda_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO amda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO amda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO amda_user;

-- Quitter psql
\q
```

## Configuration Réseau (Optionnel - pour accès distant)

Si vous voulez accéder à PostgreSQL depuis votre machine locale (pour Prisma Studio par exemple) :

```bash
# Éditer pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Ajouter cette ligne (remplacer VOTRE_IP par votre IP publique):
# host    amda    amda_user    VOTRE_IP/32    md5

# Éditer postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Modifier cette ligne:
# listen_addresses = 'localhost'
# en
# listen_addresses = '*'

# Redémarrer PostgreSQL
sudo systemctl restart postgresql
```

⚠️ **Sécurité** : Pour la production, il est recommandé de garder `listen_addresses = 'localhost'` et d'utiliser un tunnel SSH pour l'accès distant.

## Vérification de la Connexion

```bash
# Tester la connexion
psql -h localhost -U amda_user -d amda

# Entrer le mot de passe quand demandé
# Si connecté, vous verrez: amda=>

# Tester une requête
SELECT version();

# Quitter
\q
```

## URL de Connexion pour Prisma

Votre `DATABASE_URL` sera :

```
DATABASE_URL="postgresql://amda_user:VotreMotDePasseSecurise123!@localhost:5432/amda"
```

## Configuration du Firewall (Important)

```bash
# Vérifier le statut du firewall
sudo ufw status

# Si le firewall est actif, autoriser PostgreSQL (seulement si accès distant nécessaire)
# sudo ufw allow 5432/tcp

# Pour la production, gardez PostgreSQL en local uniquement (plus sécurisé)
```

## Maintenance PostgreSQL

### Backups Automatiques

```bash
# Créer un script de backup
sudo nano /root/backup-postgres.sh
```

Contenu du script :

```bash
#!/bin/bash
BACKUP_DIR="/root/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup de la base amda
sudo -u postgres pg_dump amda > $BACKUP_DIR/amda_$DATE.sql

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "amda_*.sql" -mtime +7 -delete

echo "Backup completed: amda_$DATE.sql"
```

```bash
# Rendre le script exécutable
sudo chmod +x /root/backup-postgres.sh

# Ajouter au cron pour backup quotidien à 2h du matin
sudo crontab -e

# Ajouter cette ligne:
0 2 * * * /root/backup-postgres.sh >> /var/log/postgres-backup.log 2>&1
```

### Restauration d'un Backup

```bash
# Restaurer depuis un backup
sudo -u postgres psql amda < /root/backups/postgres/amda_20260812_020000.sql
```

### Logs PostgreSQL

```bash
# Voir les logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Ou avec journalctl
sudo journalctl -u postgresql -f
```

## Optimisation PostgreSQL (Optionnel)

Pour un VPS avec 2-4GB de RAM :

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Ajuster ces paramètres :

```ini
# Pour 2GB RAM
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
max_connections = 100
```

```bash
# Redémarrer PostgreSQL
sudo systemctl restart postgresql
```

## Dépannage

### PostgreSQL ne démarre pas

```bash
# Vérifier les logs
sudo journalctl -u postgresql -n 50

# Vérifier la configuration
sudo -u postgres /usr/lib/postgresql/14/bin/postgres -D /var/lib/postgresql/14/main -C config_file
```

### Erreur de connexion

```bash
# Vérifier que PostgreSQL écoute
sudo netstat -tlnp | grep 5432

# Vérifier l'authentification
sudo cat /etc/postgresql/14/main/pg_hba.conf | grep -v "^#"
```

### Réinitialiser le mot de passe

```bash
sudo -u postgres psql

# Dans psql:
ALTER USER amda_user WITH PASSWORD 'NouveauMotDePasse123!';
\q
```

## ✅ Installation Terminée

Votre PostgreSQL est prêt ! Passez maintenant à l'étape suivante : configuration du fichier `.env` et déploiement du backend.
