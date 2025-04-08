#!/usr/bin/env bash
# Install Chrome
apt-get update && apt-get install -y chromium-browser

# Build your app
npm install
npm run build