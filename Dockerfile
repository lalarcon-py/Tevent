FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend package files and install dependencies
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# Copy backend package files and install dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# Copy all files
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Set environment variables
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start command (first run migrations and seeds, then start the server)
CMD cd backend && npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && node index.js
