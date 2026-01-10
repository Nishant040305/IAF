# Backend & Admin Dashboard Startup Guide

Quick reference for starting the VayuReader backend and admin dashboard.

---

## 1. Start Backend (Docker)

```bash
cd VayuReader_Backend_v2
docker-compose --profile dev up -d
```

This starts:
- `vayureader_api` - Backend API (Port 3000, proxied via Nginx)
- `vayureader_gateway` - Nginx (Ports 80, 443)
- `vayureader_db` - MongoDB
- `vayureader_cache` - Redis
- `vayureader_sms` - OTP Simulator (Port 8000)

### Check Status
```bash
docker-compose ps
docker-compose logs -f app
```

### Stop Everything
```bash
docker-compose down
```

---

## 2. Start Admin Dashboard

```bash
cd admin-dashboard
PORT=3001 npm start
```

Opens at: **http://localhost:3001**

---

## 3. Start Mobile App (Development)

```bash
cd VayuReader_Frontend
npm run android
```

---

## URLs

| Service | URL |
|---------|-----|
| Backend API | https://localhost |
| Admin Dashboard | http://localhost:3001 |
| SMS Simulator | http://localhost:8000 |

---

## First Time Setup

1. Generate SSL certs (one-time):
```bash
cd VayuReader_Backend_v2
docker run --rm -v "$(pwd)/nginx/certs:/certs" alpine /bin/sh -c "apk add --no-cache openssl && \
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout /certs/server.key -out /certs/server.crt \
-subj '/C=US/ST=State/L=City/O=Organization/CN=localhost' \
-addext 'subjectAltName = DNS:localhost, IP:127.0.0.1'"
```

2. Create Super Admin:
```bash
docker-compose exec app node scripts/seedAdmin.js "Admin" "9999999999" "Password123"
```
