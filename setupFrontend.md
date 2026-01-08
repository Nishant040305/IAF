# VayuReader Frontend Setup Guide

This guide covers both the **Mobile App** and the **Admin Dashboard**.

## 1. Mobile Application (React Native / Expo)

### Environment Setup (`.env`)
In `VayuReader_Frontend/.env`:
```env
EXPO_PUBLIC_AUTH_BASE_URL=https://localhost
EXPO_PUBLIC_PDF_BASE_URL=https://localhost
EXPO_PUBLIC_DICT_BASE_URL=https://localhost
EXPO_PUBLIC_ABBR_BASE_URL=https://localhost
```

### Running the App
```bash
cd VayuReader_Frontend
npm install
npm run android  # or npm run ios
```

### Optimized Release Build
Generates a small APK (~30MB) instead of the default 200MB.
```bash
cd VayuReader_Frontend/android
./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/`

---

## 2. Admin Dashboard (React)

### Environment Setup (`.env.local`)
In `admin-dashboard/.env.local`:
```env
REACT_APP_API_BASE_URL=https://localhost
HTTPS=true
```

### Running the Dashboard
```bash
cd admin-dashboard
npm install
PORT=3001 npm start
```
Access at: `https://localhost:3001`

---

## 3. Important: SSL Trust
Since we use self-signed certificates for local development:
1. Open your browser.
2. Visit `https://localhost/health`.
3. Click **"Advanced"** and then **"Proceed to localhost (unsafe)"**.
This ensures the browser and mobile emulator trust the backend API.
