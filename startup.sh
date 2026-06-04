#!/bin/sh
# Startup script for Docker environment

cd /app

mkdir -p logs uploads

node app/index.js
