#!/bin/bash

# Backup InfraManager Database
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
CONTAINER_NAME="inframanager-db"
DB_USER=${DB_USER:-inframan}
DB_NAME=${DB_NAME:-inframanager}

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

echo "📦 Starting backup for $DB_NAME..."

# Execute pg_dump inside the container
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup success: $BACKUP_DIR/backup_$TIMESTAMP.sql"
    
    # Compress backup
    gzip "$BACKUP_DIR/backup_$TIMESTAMP.sql"
    echo "✅ Compressed: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

    # Optional: Delete backups older than 30 days
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
    echo "🧹 Cleaned up backups older than 30 days."
else
    echo "❌ Backup failed!"
    exit 1
fi
