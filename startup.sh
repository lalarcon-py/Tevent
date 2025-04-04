#!/bin/sh
# Startup script for TeventGM in Docker environment

# Ensure we're in the project root directory
cd /app

# Create needed directories
mkdir -p logs uploads

# Start the application 
node app/index.js
