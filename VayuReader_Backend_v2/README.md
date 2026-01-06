# VayuReader Backend v2.0

Secure, well-structured backend API for VayuReader application.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values

# 3. Start server
npm run dev
```

## Architecture

```
src/
├── config/           # Environment, database, CORS configuration
├── middleware/       # Auth, rate limiting, validation, error handling
├── models/           # Mongoose schemas (User, Admin, PDF, Word, Abbreviation)
├── routes/           # API route handlers
├── services/         # Business logic (JWT, OTP, SMS, Audit)
├── utils/            # Helpers (sanitize, response, file validation)
└── server.js         # Main entry point
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login/request-otp` | Request OTP for user login |
| `POST /api/auth/login/verify-otp` | Verify OTP and get token |
| `POST /api/admin/login/request-otp` | Request OTP for admin login |
| `POST /api/admin/login/verify-otp` | Verify admin OTP and get token |
| `GET /api/pdfs` | Search PDFs |
| `POST /api/pdfs/upload` | Upload PDF (admin) |
| `GET /api/dictionary/word/:word` | Look up word |
| `GET /api/abbreviations/:abbr` | Look up abbreviation |
| `GET /api/audit/logs` | View audit logs (admin) |

## Security Features

- ✅ Rate limiting on all endpoints
- ✅ OTP-based authentication for both users and admins
- ✅ Role-based access control (RBAC)
- ✅ Input sanitization (ReDoS prevention)
- ✅ Whitelist-based CORS
- ✅ Fail-fast on missing secrets
- ✅ Secure file upload with type validation
- ✅ Audit logging for all admin actions

## Environment Variables

See `.env.example` for full list. Required:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `OTP_GATEWAY_URL` - SMS gateway URL (msg.com compatible)

## Initial Admin Setup

Create first admin directly in MongoDB:

```javascript
db.admins.insertOne({
  name: "Admin Name",
  contact: "1234567890",
  isSuperAdmin: true,
  permissions: [],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## License

PRIVATE - IAF
