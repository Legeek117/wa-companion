#!/bin/bash
# Installation rapide AMDA sur serveur Debian (sans systemd)
# Usage: bash install-server.sh

set -e

echo "🚀 AMDA Installation Script (Debian, No systemd)"
echo "=================================================="

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "✅ Node.js $(node --version)"

# Vérifier PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
fi

echo "✅ PostgreSQL installed"

# Vérifier Redis (optionnel)
if ! command -v redis-cli &> /dev/null; then
    echo "📦 Installing Redis..."
    sudo apt install -y redis-server
fi

echo "✅ Redis installed"

# Créer répertoires
echo "📁 Creating directories..."
sudo mkdir -p /var/amda/{uploads,sessions,logs,pgdata}
sudo chown -R $(whoami):$(whoami) /var/amda 2>/dev/null || \
  sudo chown -R amda:amda /var/amda

# Créer utilisateur PostgreSQL
echo "🗄️  Setting up PostgreSQL..."
read -p "PostgreSQL password for 'amda' user: " PG_PASSWORD
sudo -u postgres psql -c "CREATE USER amda WITH PASSWORD '$PG_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE amda OWNER amda;" 2>/dev/null || true

# Cloner/mettre à jour le code
echo "📥 Cloning repository..."
if [ ! -d "/opt/amda" ]; then
    sudo mkdir -p /opt/amda
    sudo git clone https://github.com/Legeek117/wa-companion.git /opt/amda
else
    cd /opt/amda && sudo git pull origin main
fi

# Installer dépendances Node
echo "📦 Installing Node dependencies..."
cd /opt/amda/backend
sudo npm install

# Copier et configurer .env
if [ ! -f ".env" ]; then
    echo "⚙️  Configuring .env..."
    cp .env.example .env

    # Générer secrets
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    JWT_REFRESH=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://amda:$PG_PASSWORD@localhost:5432/amda\"|" .env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=\"$JWT_SECRET\"|" .env
    sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\"$JWT_REFRESH\"|" .env

    echo "⚠️  Edit .env to set FRONTEND_URL and API_URL:"
    echo "   nano /opt/amda/backend/.env"
else
    echo "✅ .env already exists"
fi

# Démarrer PostgreSQL
echo "🚀 Starting PostgreSQL..."
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/14/main start 2>/dev/null || \
  sudo service postgresql start 2>/dev/null || \
  echo "⚠️  PostgreSQL may already be running"

sleep 2

# Démarrer Redis
echo "🚀 Starting Redis..."
redis-server --daemonize yes 2>/dev/null || \
  sudo service redis-server start 2>/dev/null || \
  echo "⚠️  Redis may already be running"

# Migrer la base
echo "🗄️  Running database migrations..."
npm run prisma:migrate

# Compiler
echo "🔨 Building TypeScript..."
npm run build

# Installer PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2 2>/dev/null || npm install -g pm2

# Créer ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'amda-backend',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    cwd: '/opt/amda/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/amda/logs/pm2-error.log',
    out_file: '/var/amda/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Démarrer avec PM2
echo "🚀 Starting backend with PM2..."
pm2 start ecosystem.config.js
pm2 status

echo ""
echo "✅ INSTALLATION COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Edit .env to set FRONTEND_URL and API_URL"
echo "2. Setup Nginx reverse proxy (see DEPLOYMENT_SERVER.md)"
echo "3. Setup HTTPS with Certbot"
echo "4. Update Netlify VITE_API_URL"
echo ""
echo "Check logs:"
echo "  pm2 logs amda-backend"
echo ""
echo "Test API:"
echo "  curl http://localhost:3000/health"
