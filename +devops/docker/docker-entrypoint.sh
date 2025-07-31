#!/bin/sh

# Migrations
pnpx prisma migrate deploy

# Start
npm run start:prod
