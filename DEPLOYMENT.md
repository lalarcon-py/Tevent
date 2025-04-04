# TeventGM Discord Bot Deployment Guide

This document provides instructions for deploying the TeventGM Discord bot.

## Environment Variables

The following environment variables are required for the bot to function properly:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_BOT_TOKEN` | Discord bot token | Yes | None |
| `DISCORD_CLIENT_ID` | Discord application client ID | Yes | None |
| `DISCORD_CLIENT_SECRET` | Discord application client secret | Yes | None |
| `DATABASE_URL` | PostgreSQL connection string | Yes | None |
| `DATABASE_USE_SSL` | Whether to use SSL for database connection | No | "false" |
| `REDIS_URL` | Redis connection string | No | None |
| `API_URL` | Backend API URL | No | "https://tevent.app" |
| `FRONTEND_URL` | Frontend URL | No | "https://tevent.app" |
| `BOT_WEBHOOK_SECRET` | Secret for webhook authentication | No | Generated |
| `BOT_PORT` | Port for bot webhook server | No | 3300 |
| `NODE_ENV` | Node environment | No | "production" |

## Redis Configuration

Redis is used for caching and rate limiting but is optional. If not provided, the bot will use in-memory alternatives.

To enable Redis, set the `REDIS_URL` environment variable:

```
REDIS_URL=redis://username:password@host:port
```

For local development without Redis, you can leave this variable unset.

## Database Setup

The bot requires a PostgreSQL database. Set the `DATABASE_URL` environment variable:

```
DATABASE_URL=postgresql://username:password@host:port/database
```

## Deployment Options

### Railway

1. Create a new project on Railway
2. Add a PostgreSQL service
3. Add the Discord bot service using this GitHub repository
4. Set the required environment variables
5. Deploy the service

### Docker

1. Build the Docker image:
   ```
   docker build -t teventgm-bot .
   ```

2. Run the container:
   ```
   docker run -d \
     -e DISCORD_BOT_TOKEN=your_token \
     -e DISCORD_CLIENT_ID=your_client_id \
     -e DISCORD_CLIENT_SECRET=your_client_secret \
     -e DATABASE_URL=your_database_url \
     -p 3300:3300 \
     teventgm-bot
   ```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues, verify:
- The `DATABASE_URL` is correct
- The database is accessible from the deployment environment
- `DATABASE_USE_SSL` is set correctly based on your database configuration

### Redis Connection Issues

If you see Redis connection errors:
- Verify the `REDIS_URL` is correct if you're using Redis
- If you don't need Redis, you can safely ignore these errors as the bot falls back to in-memory alternatives
- To disable Redis entirely, leave the `REDIS_URL` environment variable unset

### Discord API Issues

If the bot fails to connect to Discord:
- Verify the `DISCORD_BOT_TOKEN` is correct
- Ensure the bot has the necessary permissions in your Discord server
- Check that the bot is properly invited to your server
