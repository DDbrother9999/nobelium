#!/bin/bash

rm -rf .next node_modules

npm install
npm run build

if pm2 describe "nobelium-dev" > /dev/null 2>&1; then
  PORT=8081 pm2 restart "nobelium-dev" --update-env
else
  PORT=8081 pm2 start npm --name "nobelium-dev" -- run start
fi

pm2 save
