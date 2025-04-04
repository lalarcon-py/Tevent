FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy all source files to maintain original directory structure
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose ports
EXPOSE 3000
EXPOSE 3300

# The build and start commands will be handled by Railway's custom commands
