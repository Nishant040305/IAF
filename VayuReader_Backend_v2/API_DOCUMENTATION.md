# VayuReader Backend v2 - API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
- **User Auth**: Bearer token in `Authorization` header
- **Admin Auth**: HTTP-only cookie (`admin_token`) or Bearer token
- **2FA**: Password + OTP for admin login

---

# 📱 User Authentication

## Request OTP
`POST /api/auth/login/request-otp`

Request OTP for user login. Creates user if doesn't exist.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | ✅ | 10-digit phone number |
| name | string | ✅ | User's name |

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": { "otp": "123456" } // DEV mode only
}
```

---

## Verify OTP
`POST /api/auth/login/verify-otp`

Verify OTP and complete user login.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | ✅ | 10-digit phone number |
| otp | string | ✅ | 6-digit OTP |

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "...", "phone_number": "..." }
  }
}
```
> Cookie `auth_token` is set automatically

---

## User Logout
`POST /api/auth/logout`

Clear user session cookie.

**Response:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

## Get Profile
`GET /api/auth/profile`

Get current user's profile. **Requires: User Auth**

**Response:**
```json
{
  "success": true,
  "data": { "id": "...", "name": "...", "phone_number": "..." }
}
```

---

# 🔐 Admin Authentication

## Admin Login Step 1
`POST /api/admin/login/request-otp`

Verify password and request OTP.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| contact | string | ✅ | 10-digit phone number |
| password | string | ✅ | Admin password |

**Response:**
```json
{
  "success": true,
  "data": {
    "loginToken": "abc123...",
    "message": "OTP sent",
    "otp": "123456" // DEV mode only
  }
}
```

---

## Admin Login Step 2
`POST /api/admin/login/verify-otp`

Verify OTP and complete admin login. Sets HTTP-only cookie.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| contact | string | ✅ | 10-digit phone number |
| otp | string | ✅ | 6-digit OTP |
| loginToken | string | ✅ | Token from Step 1 |

**Response:**
```json
{
  "success": true,
  "data": {
    "admin": { "id": "...", "name": "...", "isSuperAdmin": true }
  }
}
```
> Cookie `admin_token` is set automatically

---

## Admin Logout
`POST /api/admin/logout`

Clear admin session cookie.

**Response:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

# 👥 Sub-Admin Management

## Get All Sub-Admins
`GET /api/admin/sub-admins`

**Requires:** Super Admin

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "...", "contact": "...", "permissions": [...] }
  ]
}
```

---

## Create Sub-Admin
`POST /api/admin/sub-admins`

**Requires:** Super Admin

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | Sub-admin name |
| contact | string | ✅ | 10-digit phone |
| password | string | ✅ | Initial password |
| permissions | array | ❌ | Permission list |

---

## Delete Sub-Admin
`DELETE /api/admin/sub-admins/:id`

**Requires:** Super Admin

---

# 📄 PDF Documents

## Search PDFs
`GET /api/pdfs?search=keyword&page=1&limit=50`

**Requires:** Auth (User or Admin)

| Query Param | Type | Default | Max | Description |
|-------------|------|---------|-----|-------------|
| search | string | - | - | Search term |
| page | int | 1 | - | Page number |
| limit | int | 50 | 200 | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [...],
    "pagination": { "page": 1, "limit": 50, "total": 100, "totalPages": 2 }
  }
}
```

---

## Get All PDFs
`GET /api/pdfs/all?page=1&limit=50`

**Requires:** Auth (User or Admin)

---

## Get PDF by ID
`GET /api/pdfs/:id`

**Requires:** Auth (User or Admin)

Increments view count.

---

## Upload PDF
`POST /api/pdfs/upload`

**Requires:** Admin with `manage_pdfs` permission

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | ✅ | Document title |
| pdf | file | ✅ | PDF file (max 50MB) |
| thumbnail | file | ❌ | Thumbnail image |
| content | string | ❌ | Description |
| category | string | ❌ | Category |

---

## Update PDF
`PUT /api/pdfs/:id`

**Requires:** Admin with `manage_pdfs` permission

Same fields as upload (all optional).

---

## Delete PDF
`DELETE /api/pdfs/:id`

**Requires:** Admin with `manage_pdfs` permission

---

# 📖 Dictionary

## Lookup Word (Public)
`GET /api/dictionary/word/:word`

No authentication required.

**Response:**
```json
{
  "success": true,
  "data": {
    "word": "EXAMPLE",
    "meanings": [{ "partOfSpeech": "noun", "definition": "..." }],
    "synonyms": [...],
    "antonyms": [...]
  }
}
```

---

## Get Words (Preview)
`GET /api/dictionary/words`

**Requires:** Auth

Returns first 100 words (word field only).

---

## Get All Words
`GET /api/dictionary/words/all?page=1&limit=100`

**Requires:** Auth

| Query Param | Type | Default | Max |
|-------------|------|---------|-----|
| page | int | 1 | - |
| limit | int | 100 | 1000 |

**Response:**
```json
{
  "success": true,
  "data": {
    "words": [...],
    "pagination": { "page": 1, "limit": 100, "total": 5000, "totalPages": 50 }
  }
}
```

---

## Search Words
`GET /api/dictionary/search/:term`

**Requires:** Auth

---

## Create Word
`POST /api/dictionary`

**Requires:** Admin with `manage_dictionary` permission

```json
{
  "word": "EXAMPLE",
  "meanings": [{ "partOfSpeech": "noun", "definition": "A specimen" }],
  "synonyms": ["sample"],
  "antonyms": ["original"]
}
```

---

## Update Word
`PUT /api/dictionary/:id`

**Requires:** Admin with `manage_dictionary` permission

---

## Delete Word
`DELETE /api/dictionary/:id`

**Requires:** Admin with `manage_dictionary` permission

---

## Bulk Upload Dictionary
`POST /api/dictionary/upload`

**Requires:** Admin with `manage_dictionary` permission

Batches in 500-word chunks.

```json
{
  "WORD1": { "MEANINGS": [["noun", "definition", [], []]], "SYNONYMS": [], "ANTONYMS": [] },
  "WORD2": { ... }
}
```

---

## Export Dictionary
`GET /api/dictionary/export/all`

**Requires:** Admin with `manage_dictionary` permission

---

# 📝 Abbreviations

## Search Abbreviations
`GET /api/abbreviations?search=keyword`

**Requires:** Auth

---

## Get All Abbreviations
`GET /api/abbreviations/all?page=1&limit=100`

**Requires:** Auth

| Query Param | Type | Default | Max |
|-------------|------|---------|-----|
| page | int | 1 | - |
| limit | int | 100 | 500 |

---

## Get Abbreviation
`GET /api/abbreviations/:abbr`

**Requires:** Auth

---

## Create Abbreviation
`POST /api/abbreviations`

**Requires:** Admin with `manage_abbreviations` permission

```json
{ "abbreviation": "IAF", "fullForm": "Indian Air Force" }
```

---

## Update Abbreviation
`PUT /api/abbreviations/:id`

**Requires:** Admin with `manage_abbreviations` permission

---

## Delete Abbreviation
`DELETE /api/abbreviations/:id`

**Requires:** Admin with `manage_abbreviations` permission

---

## Bulk Upload Abbreviations
`POST /api/abbreviations/bulk`

**Requires:** Admin with `manage_abbreviations` permission

```json
[
  { "abbreviation": "IAF", "fullForm": "Indian Air Force" },
  { "abbreviation": "HAL", "fullForm": "Hindustan Aeronautics Limited" }
]
```

---

## Export Abbreviations
`GET /api/abbreviations/export/all`

**Requires:** Admin with `manage_abbreviations` permission

---

# 🔔 Real-Time Events (SSE)

## Connect to Events Stream
`GET /api/events`

**Requires:** Auth (User or Admin)

Establishes a Server-Sent Events connection for real-time PDF updates.

**Headers:**
```
Accept: text/event-stream
```

**Events:**
| Event | Trigger | Payload |
|-------|---------|---------|
| `connected` | Connection established | `{ message }` |
| `PDF_ADDED` | New PDF uploaded | `{ id, title, category, createdAt, timestamp }` |
| `PDF_UPDATED` | PDF modified | `{ id, title, category, updatedAt, timestamp }` |
| `PDF_DELETED` | PDF removed | `{ id, title, timestamp }` |

**Example:**
```javascript
const es = new EventSource('/api/events?token=YOUR_TOKEN');
es.addEventListener('PDF_ADDED', (e) => console.log(JSON.parse(e.data)));
```

> See [SSE_INTEGRATION.md](./SSE_INTEGRATION.md) for detailed client integration examples.

---

# 📊 Audit Logs

## Get Audit Logs
`GET /api/audit/logs?page=1&limit=50`

**Requires:** Admin with `view_audit` permission

| Query Param | Type | Description |
|-------------|------|-------------|
| page | int | Page number |
| limit | int | Items per page |
| action | string | Filter by action type |
| resource | string | Filter by resource type |
| adminId | string | Filter by admin ID |

---

## Get Audit Stats
`GET /api/audit/stats`

**Requires:** Admin with `view_audit` permission

---

# ⚠️ Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE"
}
```

| HTTP Code | Error Code | Description |
|-----------|------------|-------------|
| 400 | BAD_REQUEST | Invalid input |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate resource |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 408 | REQUEST_TIMEOUT | Request took too long |

---

# 🔧 Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 1000 requests | 15 min |
| OTP Request | 5 requests | 15 min |
| Login Attempt | 10 attempts | 15 min |
