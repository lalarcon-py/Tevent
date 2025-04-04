FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app directory first
COPY app /app/app

# Copy discord-bot directory
COPY discord-bot /app/discord-bot

# Copy other necessary files
COPY index.js /app/

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose ports
EXPOSE 3000
EXPOSE 3300

# Set startup command
CMD ["sh", "-c", "node /app/app/index.js"]
