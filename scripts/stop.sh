#!/bin/bash

# Stop InfraManager
echo "🛑 Stopping InfraManager..."

docker compose -f docker-compose.prod.yml down

echo "✅ InfraManager stopped."
