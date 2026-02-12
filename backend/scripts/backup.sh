#!/bin/bash

# Default values if not provided by environment
DB_HOST=${DB_HOST:-db}
DB_NAME=${DB_NAME:-inframanager}
DB_USER=${DB_USER:-inframan}
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup using pg_dump and compress it
# We use -h $DB_HOST because the DB is usually a separate container
PGPASSWORD=$DB_PASSWORD pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup created: $BACKUP_FILE"
  exit 0
else
  echo "Error: Backup failed" >&2
  exit 1
fi
