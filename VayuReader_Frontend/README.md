# Intshorts Frontend

Expo + React Native app for Intshorts.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env
```

3. Update backend URL(s) in `.env` (see next section).

4. Run Android app:

```bash
npm run android
```

## Backend Connection

Backend URLs are read from Expo public env vars in `constants/config.ts`.

- `EXPO_PUBLIC_BACKEND_URL`: fallback for all services
- `EXPO_PUBLIC_AUTH_BASE_URL`: auth API base URL
- `EXPO_PUBLIC_PDF_BASE_URL`: PDF API base URL
- `EXPO_PUBLIC_DICT_BASE_URL`: dictionary API base URL
- `EXPO_PUBLIC_ABBR_BASE_URL`: abbreviations API base URL

If service-specific values are not set, the app uses `EXPO_PUBLIC_BACKEND_URL`.

## Local Backend URL Tips

- Android emulator: use `http://10.0.2.2:<PORT>`
- Physical Android device: use `http://<YOUR_COMPUTER_LAN_IP>:<PORT>`
- If your backend is HTTPS, use `https://...`

Example:

```dotenv
EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:3000
```

After changing `.env`, restart Expo/Metro so new variables are picked up.
