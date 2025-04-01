#!/bin/bash
set -e

# Check if we're running in local development or Fly.io
if [ "$RAILS_ENV" = "development" ]; then
  # Local Docker environment
  until PGPASSWORD=password psql -h "db" -U "postgres" -c '\q'; do
    >&2 echo "Postgres is unavailable - sleeping"
    sleep 1
  done
else
  # Production environment (Fly.io)
  if [ -n "$DATABASE_URL" ]; then
    # Parse the DATABASE_URL to get the components
    DB_HOST=$(echo $DATABASE_URL | awk -F[@/] '{print $4}')
    DB_USER=$(echo $DATABASE_URL | awk -F[:@] '{print $2}' | sed 's/\/\///')
    DB_PASSWORD=$(echo $DATABASE_URL | awk -F[:@] '{print $3}')
    DB_NAME=$(echo $DATABASE_URL | awk -F[/] '{print $NF}')

    # Wait for database to be ready
    until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
      >&2 echo "Postgres is unavailable - sleeping"
      sleep 1
    done
  else
    echo "DATABASE_URL is not set. Skipping database check."
  fi
fi

# Create, migrate, and seed the database
bundle exec rails db:prepare

# Remove a potentially pre-existing server.pid for Rails
rm -f /app/tmp/pids/server.pid

# Then exec the container's main process (what's set as CMD in the Dockerfile)
exec "$@" 