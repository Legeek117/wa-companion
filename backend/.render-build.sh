#!/bin/bash
# Script de build pour Render
# Ce script est exécuté automatiquement par Render lors du déploiement

set -e  # Arrêter en cas d'erreur

echo "🔨 Building AMDA Backend..."

# Aller dans le dossier backend
cd backend

# Installer les dépendances
echo "📦 Installing dependencies..."
npm install

# Builder le projet TypeScript
echo "🔧 Building TypeScript..."
npm run build

# Vérifier que le build a réussi
if [ ! -d "dist" ]; then
  echo "❌ Build failed: dist directory not found"
  exit 1
fi

echo "✅ Build completed successfully!"

