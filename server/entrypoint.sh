#!/bin/bash
set -e

# Wait for database to be ready
until PGPASSWORD=password psql -h "db" -U "postgres" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

# Create, migrate, and seed the database
bundle exec rails db:prepare

# Remove a potentially pre-existing server.pid for Rails
rm -f /app/tmp/pids/server.pid

# Then exec the container's main process (what's set as CMD in the Dockerfile)
exec "$@" 