#!/bin/bash

# Script de démarrage de la base de données PostgreSQL
# Usage: ./scripts/start-db.sh

echo "🐘 Démarrage de PostgreSQL pour Captivia..."

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Erreur: Docker n'est pas installé."
    echo "Veuillez installer Docker Desktop depuis: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Vérifier que Docker daemon est démarré
if ! docker ps &> /dev/null; then
    echo "❌ Erreur: Docker daemon n'est pas démarré."
    echo ""
    echo "Sur macOS:"
    echo "  1. Ouvrez Docker Desktop depuis Applications ou Spotlight (Cmd+Space)"
    echo "  2. Attendez que Docker soit complètement démarré (icône stable dans la barre de menu)"
    echo "  3. Relancez ce script"
    echo ""
    echo "Pour vérifier que Docker fonctionne: docker ps"
    exit 1
fi

# Détecter si docker-compose ou docker compose est disponible
if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_CMD="docker compose"
else
    echo "⚠️  Docker Compose n'est pas disponible."
    echo "🔄 Utilisation de 'docker run' à la place..."
    
    # Vérifier si le conteneur existe déjà
    if docker ps -a --format '{{.Names}}' | grep -q "^captivia-postgres$"; then
        echo "📦 Le conteneur existe déjà."
        if docker ps --format '{{.Names}}' | grep -q "^captivia-postgres$"; then
            echo "✅ PostgreSQL est déjà en cours d'exécution!"
        else
            echo "🔄 Démarrage du conteneur existant..."
            docker start captivia-postgres
            sleep 3
            echo "✅ PostgreSQL démarré!"
        fi
    else
        echo "📦 Création et démarrage du conteneur..."
        docker run -d \
          --name captivia-postgres \
          -e POSTGRES_USER=user \
          -e POSTGRES_PASSWORD=password \
          -e POSTGRES_DB=captivia \
          -p 5432:5432 \
          postgres:15-alpine
        
        echo "⏳ Attente que PostgreSQL soit prêt..."
        sleep 5
        
        if docker ps --format '{{.Names}}' | grep -q "^captivia-postgres$"; then
            echo "✅ PostgreSQL démarré et prêt!"
        else
            echo "❌ Erreur lors du démarrage"
            docker logs captivia-postgres
            exit 1
        fi
    fi
    
    echo ""
    echo "📝 Informations de connexion:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: captivia"
    echo "   User: user"
    echo "   Password: password"
    echo ""
    echo "🔗 URL de connexion:"
    echo "   postgresql://user:password@localhost:5432/captivia"
    
    exit 0
fi

echo "✅ Utilisation de: $DOCKER_CMD"

# Démarrer PostgreSQL
$DOCKER_CMD up -d

# Attendre que la base soit prête
echo "⏳ Attente que PostgreSQL soit prêt..."
sleep 5

# Vérifier le statut
if $DOCKER_CMD ps | grep -q "captivia-postgres.*Up"; then
    echo "✅ PostgreSQL est démarré et prêt!"
    echo ""
    echo "📝 Informations de connexion:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: captivia"
    echo "   User: user"
    echo "   Password: password"
    echo ""
    echo "🔗 URL de connexion:"
    echo "   postgresql://user:password@localhost:5432/captivia"
else
    echo "⚠️  Erreur lors du démarrage de PostgreSQL"
    $DOCKER_CMD logs postgres
    exit 1
fi
