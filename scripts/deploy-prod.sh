#!/bin/bash

rm -rf .next node_modules

npm install
npm run build

if pm2 describe "nobelium" > /dev/null 2>&1; then
  PORT=8080 pm2 restart "nobelium" --update-env
else
  PORT=8080 pm2 start npm --name "nobelium" -- run start
fi

pm2 save
