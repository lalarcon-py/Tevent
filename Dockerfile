FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy all source files
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads

# Set up a symbolic link to make "cd backend" work from anywhere
RUN ln -s /app/backend /backend

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose ports
EXPOSE 3000
EXPOSE 3300

# Create a shell script to execute your command
RUN echo '#!/bin/bash\ncd /app && cd backend && npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && node index.js' > /app/start.sh && \
    chmod +x /app/start.sh

# Set the shell script as the entry point
CMD ["/bin/bash", "/app/start.sh"]