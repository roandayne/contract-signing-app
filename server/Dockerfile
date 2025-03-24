# syntax=docker/dockerfile:1
# check=error=true

# This Dockerfile is designed for production, not development. Use with Kamal or build'n'run by hand:
# docker build -t server .
# docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name server server

# For a containerized dev environment, see Dev Containers: https://guides.rubyonrails.org/getting_started_with_devcontainer.html

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
FROM ruby:3.3-slim

# Install system dependencies
RUN apt-get update -qq && \
    apt-get install -y \
    build-essential \
    libpq-dev \
    nodejs \
    npm \
    curl \
    postgresql-client \
    libyaml-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set environment
ENV RAILS_ENV="production" \
    BUNDLE_PATH="/usr/local/bundle"

# Install Rails dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy the rest of the application
COPY . .

# Add and configure entrypoint script
COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh

# Setup non-root user
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp
USER 1000:1000

# Expose the production port
EXPOSE 80

# Set the entrypoint and default command
ENTRYPOINT ["/usr/bin/entrypoint.sh"]
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]
