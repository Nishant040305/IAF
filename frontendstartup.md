# VayuReader Frontend Setup Guide

This guide covers both the **Mobile App** and the **Admin Dashboard**.

## 1. Mobile Application (React Native / Expo)

### Environment Setup (`.env`)
In `VayuReader_Frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=https://localhost
```

### Running the App
```bash
cd VayuReader_Frontend
npm install
npm run android  # or npm run ios
```

### Local Development SSL Bypass (Self-Signed / Localhost Only)
**Note:** If pointing to a production server with a valid SSL certificate (e.g., `https://reader.afcel.in`), no bypass is needed. Use the production URL in your `.env`.

If you encounter "Network Error" when testing against a **local development backend** (self-signed):
1. **Frontend `.env`**: Set `EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2` (use `http` instead of `https`).
2. **Android Security**: Ensure `VayuReader_Frontend/android/app/src/main/res/xml/network_security_config.xml` permits cleartext traffic.
3. **Clean Start**: Restart the Expo server with `npx expo start --clear`.

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
