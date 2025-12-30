# Postman Testing Guide for VayuReader API

## Base URLs
- **Auth Service**: `http://localhost:3010`
- **Admin Auth Service**: `http://localhost:3012`
- **Abbreviations Service**: `http://localhost:3001`
- **PDF Service**: `http://localhost:3005`
- **Dictionary Service**: `http://localhost:3000`

---

## 1. User OTP Login Flow (Read-Only Access)

### Step 1: Request OTP
**Method**: `POST`  
**URL**: `http://localhost:3010/api/auth/login/request-otp`  
**Headers**: 
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "name": "Test User",
  "phone_number": "9876543210"
}
```
**Expected Response**: `200 OK`
```json
{
  "success": true,
  "message": "OTP sent successfully" // or "OTP generated (DEV MODE - SMS skipped)"
}
```
**Note**: In dev mode, OTP will be returned in response for testing.

### Step 2: Verify OTP and Get User Token
**Method**: `POST`  
**URL**: `http://localhost:3010/api/auth/login/verify-otp`  
**Headers**: 
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "phone_number": "9876543210",
  "otp": "123456" // Use the OTP from Step 1 (if in dev mode)
}
```
**Expected Response**: `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Test User",
    "phone_number": "9876543210"
  }
}
```
**Save the token** - You'll need it for subsequent requests.

---

## 2. Admin Login (Full Access)

### Step 1: Super Admin Login
**Method**: `POST`  
**URL**: `http://localhost:3012/api/auth/login`  
**Headers**: 
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "name": "Himanshu Bhatt",
  "contact": "89200 67341"
}
```
**Expected Response**: `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "name": "Himanshu Bhatt",
    "contact": "89200 67341",
    "type": "super_admin",
    "isSuperAdmin": true
  }
}
```
**Save the token** - This is your admin token.

### Step 2: Sub-Admin Login (if created)
**Method**: `POST`  
**URL**: `http://localhost:3012/api/auth/login`  
**Headers**: 
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "name": "Sub Admin Name",
  "contact": "1234567890"
}
```
**Expected Response**: `200 OK` (same format as super admin, but `isSuperAdmin: false`)

---

## 3. Testing Read Routes with User Token (Should Work ✅)

Use the **user token** from Step 2 of User OTP Login.

### 3.1 Get Abbreviation by Name
**Method**: `GET`  
**URL**: `http://localhost:3001/api/abbreviations/IAF`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `200 OK` - Returns abbreviation data

### 3.2 Get All Abbreviations
**Method**: `GET`  
**URL**: `http://localhost:3001/api/abbreviations/all`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `200 OK` - Returns list of abbreviations

### 3.3 Search PDFs
**Method**: `GET`  
**URL**: `http://localhost:3005/api/pdfs?search=test`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `200 OK` - Returns matching PDFs

### 3.4 Get All PDFs
**Method**: `GET`  
**URL**: `http://localhost:3005/api/pdfs/all`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `200 OK` - Returns list of PDFs

### 3.5 Get PDF by ID
**Method**: `GET`  
**URL**: `http://localhost:3005/api/pdfs/<PDF_ID>`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `200 OK` - Returns PDF details

### 3.6 Get Dictionary Word
**Method**: `GET`  
**URL**: `http://localhost:3000/api/dictionary/word/HELLO`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `200 OK` - Returns word definition

### 3.7 Get All Dictionary Words
**Method**: `GET`  
**URL**: `http://localhost:3000/api/dictionary/words/all`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `200 OK` - Returns list of words

### 3.8 Search Dictionary
**Method**: `GET`  
**URL**: `http://localhost:3000/api/dictionary/search/test`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `200 OK` - Returns matching words

---

## 4. Testing Write Routes with User Token (Should Fail ❌)

Use the **user token** from Step 2 of User OTP Login.

### 4.1 Try to Create Abbreviation (Should Fail)
**Method**: `POST`  
**URL**: `http://localhost:3001/api/abbreviations`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "abbreviation": "TEST",
  "fullForm": "Test Full Form"
}
```
**Expected Response**: `403 Forbidden`
```json
{
  "success": false,
  "message": "Access denied. Users can only access read operations (GET)."
}
```

### 4.2 Try to Update Abbreviation (Should Fail)
**Method**: `PUT`  
**URL**: `http://localhost:3001/api/abbreviations/<ID>`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "abbreviation": "TEST",
  "fullForm": "Updated Full Form"
}
```
**Expected Response**: `403 Forbidden` (same message as above)

### 4.3 Try to Delete Abbreviation (Should Fail)
**Method**: `DELETE`  
**URL**: `http://localhost:3001/api/abbreviations/<ID>`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Expected Response**: `403 Forbidden` (same message as above)

### 4.4 Try to Upload PDF (Should Fail)
**Method**: `POST`  
**URL**: `http://localhost:3005/api/pdfs/upload`  
**Headers**: 
```
Authorization: Bearer <USER_TOKEN>
```
**Body**: `form-data` with `pdf` file
**Expected Response**: `403 Forbidden` (same message as above)

---

## 5. Testing All Routes with Admin Token (Should Work ✅)

Use the **admin token** from Step 1 of Admin Login.

### 5.1 Create Abbreviation
**Method**: `POST`  
**URL**: `http://localhost:3001/api/abbreviations`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "abbreviation": "TEST",
  "fullForm": "Test Full Form"
}
```
**Expected Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "abbreviation": "TEST",
    "fullForm": "Test Full Form"
  }
}
```

### 5.2 Update Abbreviation
**Method**: `PUT`  
**URL**: `http://localhost:3001/api/abbreviations/<ID>`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "abbreviation": "TEST",
  "fullForm": "Updated Full Form"
}
```
**Expected Response**: `200 OK` - Returns updated abbreviation

### 5.3 Delete Abbreviation
**Method**: `DELETE`  
**URL**: `http://localhost:3001/api/abbreviations/<ID>`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
```
**Expected Response**: `200 OK`
```json
{
  "success": true,
  "message": "Abbreviation deleted successfully"
}
```

### 5.4 Upload PDF
**Method**: `POST`  
**URL**: `http://localhost:3005/api/pdfs/upload`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
```
**Body**: `form-data`
- `title`: "Test PDF"
- `content`: "Test content"
- `category`: "Test"
- `pdf`: (file) - Select a PDF file
- `thumbnail`: (file, optional) - Select an image file
**Expected Response**: `201 Created` - Returns PDF document

### 5.5 Update PDF
**Method**: `PUT`  
**URL**: `http://localhost:3005/api/pdfs/<ID>`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
```
**Body**: `form-data`
- `title`: "Updated Title"
- `content`: "Updated content"
- `category`: "Updated"
- `pdf`: (file, optional)
- `thumbnail`: (file, optional)
**Expected Response**: `200 OK` - Returns updated PDF

### 5.6 Delete PDF
**Method**: `DELETE`  
**URL**: `http://localhost:3005/api/pdfs/<ID>`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
```
**Expected Response**: `200 OK`
```json
{
  "success": true,
  "message": "PDF deleted successfully"
}
```

### 5.7 Add Dictionary Word
**Method**: `POST`  
**URL**: `http://localhost:3000/api/dictionary`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "word": "TESTWORD",
  "meanings": [
    {
      "partOfSpeech": "noun",
      "definition": "A test word",
      "synonyms": ["example"],
      "examples": ["This is a test word"]
    }
  ],
  "synonyms": ["example", "sample"],
  "antonyms": ["real"]
}
```
**Expected Response**: `201 Created` - Returns created word

### 5.8 Update Dictionary Word
**Method**: `PUT`  
**URL**: `http://localhost:3000/api/dictionary/<ID>`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```
**Body**: Same format as POST
**Expected Response**: `200 OK` - Returns updated word

### 5.9 Delete Dictionary Word
**Method**: `DELETE`  
**URL**: `http://localhost:3000/api/dictionary/<ID>`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
```
**Expected Response**: `200 OK`
```json
{
  "success": true,
  "message": "Word deleted successfully"
}
```

---

## 6. Testing Without Token (Should Fail ❌)

### 6.1 Try to Access Any Route Without Token
**Method**: `GET`  
**URL**: `http://localhost:3001/api/abbreviations/all`  
**Headers**: (No Authorization header)
**Expected Response**: `401 Unauthorized`
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

## 7. Sub-Admin Management (Super Admin Only)

### 7.1 Get All Sub-Admins
**Method**: `GET`  
**URL**: `http://localhost:3012/api/sub-admins`  
**Headers**: 
```
Authorization: Bearer <SUPER_ADMIN_TOKEN>
```
**Expected Response**: `200 OK` - Returns list of sub-admins

### 7.2 Create Sub-Admin
**Method**: `POST`  
**URL**: `http://localhost:3012/api/sub-admins`  
**Headers**: 
```
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "name": "Sub Admin Name",
  "contact": "1234567890"
}
```
**Expected Response**: `201 Created` - Returns created sub-admin

### 7.3 Delete Sub-Admin
**Method**: `DELETE`  
**URL**: `http://localhost:3012/api/sub-admins/<ID>`  
**Headers**: 
```
Authorization: Bearer <SUPER_ADMIN_TOKEN>
```
**Expected Response**: `200 OK` - Returns deleted sub-admin

**Note**: Sub-admins cannot access these routes (will get 403 Forbidden)

---

## 8. Audit Logs (Admin Only)

### 8.1 Get Audit Logs
**Method**: `GET`  
**URL**: `http://localhost:3012/api/audit/logs?page=1&limit=50`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
```
**Query Parameters** (optional):
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `action`: Filter by action (CREATE, UPDATE, DELETE)
- `resourceType`: Filter by type (ABBREVIATION, PDF, DICTIONARY_WORD)
- `adminName`: Filter by admin name
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)

**Expected Response**: `200 OK` - Returns paginated audit logs

### 8.2 Get Audit Statistics
**Method**: `GET`  
**URL**: `http://localhost:3012/api/audit/stats`  
**Headers**: 
```
Authorization: Bearer <ADMIN_TOKEN>
```
**Expected Response**: `200 OK` - Returns audit statistics

---

## Postman Collection Setup Tips

1. **Create Environment Variables**:
   - `base_url_auth`: `http://localhost:3010`
   - `base_url_admin`: `http://localhost:3012`
   - `base_url_abbreviations`: `http://localhost:3001`
   - `base_url_pdfs`: `http://localhost:3005`
   - `base_url_dictionary`: `http://localhost:3000`
   - `user_token`: (set after user login)
   - `admin_token`: (set after admin login)

2. **Use Pre-request Scripts** to automatically set tokens:
   ```javascript
   // After login requests, save token
   if (pm.response.code === 200) {
       const jsonData = pm.response.json();
       if (jsonData.token) {
           pm.environment.set("user_token", jsonData.token);
           // or pm.environment.set("admin_token", jsonData.token);
       }
   }
   ```

3. **Use Tests** to verify responses:
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });
   
   pm.test("Response has token", function () {
       var jsonData = pm.response.json();
       pm.expect(jsonData).to.have.property('token');
   });
   ```

---

## Quick Test Checklist

- [ ] User can request OTP
- [ ] User can verify OTP and get token
- [ ] User can read abbreviations (GET)
- [ ] User can read PDFs (GET)
- [ ] User can read dictionary words (GET)
- [ ] User **cannot** create/update/delete (POST/PUT/DELETE) - should get 403
- [ ] Admin can login and get token
- [ ] Admin can read all routes (GET)
- [ ] Admin can create/update/delete (POST/PUT/DELETE)
- [ ] Requests without token get 401
- [ ] Super admin can manage sub-admins
- [ ] Sub-admins cannot manage sub-admins (403)

---

## Troubleshooting

1. **401 Unauthorized**: Check if token is included in Authorization header as `Bearer <token>`
2. **403 Forbidden**: 
   - For users: You're trying to access write routes (only admins can)
   - For sub-admins: You're trying to manage sub-admins (only super admin can)
3. **500 Internal Server Error**: Check server logs and ensure all services are running
4. **Token Expired**: Login again to get a new token

