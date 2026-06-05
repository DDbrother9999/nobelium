#!/bin/bash

# Clean up old builds
rm -rf .next node_modules

# Install dependencies and build the Next.js app
npm install
npm run build

# Manage PM2
if pm2 describe "nobelium" > /dev/null 2>&1; then
  PORT=8080 pm2 restart "nobelium" --update-env
else
  PORT=8080 pm2 start npm --name "nobelium" -- run start
fi

pm2 save
