#!/bin/bash

# Start InfraManager in Production Mode
echo "🚀 Starting InfraManager (Production)..."

# Ensure .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please copy .env.example to .env and configure it."
    exit 1
fi

# Pull latest images (if using a registry) or build
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

echo "✅ InfraManager is running!"
echo "   Frontend: http://localhost"
echo "   Backend:  http://localhost/api"
