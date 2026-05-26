#!/bin/bash

# Script d'arrêt de la base de données PostgreSQL
# Usage: ./scripts/stop-db.sh

echo "🛑 Arrêt de PostgreSQL pour Captivia..."

# Détecter si docker-compose ou docker compose est disponible
if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_CMD="docker compose"
else
    echo "❌ Erreur: ni 'docker-compose' ni 'docker compose' n'est disponible."
    exit 1
fi

# Arrêter PostgreSQL
$DOCKER_CMD down

echo "✅ PostgreSQL arrêté."
