#!/bin/bash
set -e

echo "🐳 Starting SorhyAI with Docker Compose..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please copy .env.example to .env and fill in your API keys."
    echo "   cp .env.example .env"
    echo "   # Then edit .env with your actual API keys"
    exit 1
fi

# Build and start containers
docker-compose up --build
