# Throne and Liberty Guild Buddy - Discord Bot

This Discord bot integrates with the Throne and Liberty Guild Buddy web application to provide in-Discord functionality for guild management, event signups, and more.

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the following variables:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_application_client_id
   DATABASE_URL=your_database_connection_string
   DATABASE_USE_SSL=true
   REDIS_URL=your_redis_connection_string
   ```

## Running the Bot

- Production: `npm start`
- Development (with hot reload): `npm run dev`
- Bot only: `npm run start:bot`

## Features

- Event management and signups
- Team organization
- Guild storage management
- Attendance tracking
- Loot management

## Dependencies

- discord.js: Discord API client
- ioredis: Redis client for caching
- opossum: Circuit breaker for resilient operations
- express: HTTP server for health checks and API interactions
- pg: PostgreSQL client
- dotenv: Environment variable management
- node-cron: Scheduled tasks