# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm run install:all` - Install all dependencies (root, frontend, backend)
- `npm start` - Start frontend and backend concurrently
- `cd frontend && npm start` - Start frontend only
- `cd backend && npm run dev` - Start backend in development mode
- `cd backend && npm run migrate` - Run database migrations
- `cd backend && npm run seed` - Run database seeders
- `cd backend && npm run migrate:undo` - Undo all migrations
- `cd frontend && npm test` - Run frontend tests

## Code Style Guidelines
- **Imports**: Group imports by type (React, libraries, components, styles)
- **Formatting**: Follow existing code formatting conventions
- **React Components**: Use functional components with hooks
- **Error Handling**: Catch errors properly and provide useful error messages
- **File Structure**: Follow existing directory structure
- **Naming**: Use camelCase for variables/functions, PascalCase for components/classes
- **Types**: Use proper PropTypes or TypeScript interfaces when available
- **Database**: Use Sequelize ORM for database operations
- **API Endpoints**: Follow RESTful conventions