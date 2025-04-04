FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy all source files
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads

# Create a custom entrypoint script that will ensure commands run in a shell
RUN echo '#!/bin/bash\nexec "$@"' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV SHELL=/bin/bash

# Expose ports
EXPOSE 3000
EXPOSE 3300

# Use the custom entrypoint
ENTRYPOINT ["/bin/bash", "-c"]