# VayuReader Backend Setup Guide

This guide covers the setup and management of the VayuReader backend services.

## 1. Prerequisites
- **Docker Desktop**: Installed and running.
- **Node.js**: (LTS) if running scripts locally.

## 2. Quick Start (Docker)
The backend runs as a containerized stack including Node.js, MongoDB, Redis, Nginx, and an SMS simulator.

```bash
cd VayuReader_Backend_v2

# 1. Generate local SSL certificates (Required for HTTPS)
docker run --rm -v "$(pwd)/nginx/certs:/certs" alpine /bin/sh -c "apk add --no-cache openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj '/C=US/ST=State/L=City/O=Organization/CN=localhost'"

# 2. Build and start services
docker-compose --profile dev up -d --build
```

## 3. Database Seeding
To manage content, you need a Super Admin account.

```bash
# Seed a Super Admin (Replace credentials as needed)
docker-compose exec app node scripts/seedAdmin.js "9999999999" "Password123" "Super Admin"
```

## 4. Technical Fixes Applied
- **CORS**: Configured to allow Admin Dashboard on port 3001.
- **Nginx**: Fixed 404 errors for PDF viewing and enabled byte-range streaming.
- **OTP Logic**: Implemented `generateLoginToken` in `otp.service.js` for secure 2FA.
- **Data Consolidation**: Merged `pdfs` and `pdfdocuments` collections into a single source of truth.

## 5. Security Note
- **SSL Certificates**: The `server.key` and `server.crt` are ignored by git. Every new environment should regenerate them using the command in Step 2.
