# Discord Bot Migrations

**IMPORTANT NOTICE:** All database migrations have been moved to the backend application.

## Why?

The Discord bot is not capable of running direct database migrations. To maintain consistency and ensure proper database schema management, all migrations should be executed from the backend application.

## What happened to the original migrations?

Original migration files have been:
1. Backed up with `.backup` extensions in this directory
2. Consolidated into more comprehensive migrations in the backend's migrations directory

## Where to find migrations now?

All database migrations are now located in:
```
C:\Users\luisa\TeventGM\Throne-and-Liberty-Guild-Buddy\backend\migrations\
```

## How to run migrations?

Migrations should be run through the backend application's migration process. 

DO NOT attempt to run migrations directly from the Discord bot.
