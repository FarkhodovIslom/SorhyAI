#!/bin/bash
set -e

echo "🚀 SorhyAI is starting..."

# Change project directory 
cd "$(dirname "$0")"

# Install requirements
npm install --production

if [[ "$SERVICE" == "bot" ]]; then
    echo "🤖 Starting Telegram Bot..."
    node src/bot/bot.js
elif [[ "$SERVICE" == "server" ]]; then
    echo "🌐 Starting Web Server..."
    node src/server/server.js
else
    echo "❌ Unknown SERVICE: $SERVICE"
    exit 1
fi
