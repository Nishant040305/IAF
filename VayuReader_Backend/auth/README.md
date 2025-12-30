# VayuReader Authentication Service

A secure authentication service for VayuReader that supports both password-based and OTP-based (mobile number) authentication.

## Features

- 🔐 **Password-based Authentication**: Traditional signup and login with email/password
- 📱 **OTP-based Authentication**: Mobile number + OTP verification for login and signup
- 🔒 **JWT Token-based Authorization**: Secure token generation and validation
- ✅ **Input Validation**: Request validation using Joi schemas
- 🛡️ **Password Hashing**: Bcrypt password encryption
- 🧪 **Development Mode**: Skip SMS sending for local testing

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation

1. Navigate to the auth service directory:
```bash
cd VayuReader_Backend/auth
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `env.sample`):
```bash
cp env.sample .env
```

4. Update the `.env` file with your configuration (see Configuration section below)

## Configuration

Create a `.env` file in the root of the auth service with the following variables:

```env
PORT=3000
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0"
JWT_SECRET="your-super-secret-jwt-key-change-this"
OTP_GATEWAY_URL="http://msg.com:8080/smsc/sends msg"
OTP_EXPIRY_MINUTES=5
SKIP_OTP_SEND=false
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port number | `3000` | No |
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `JWT_SECRET` | Secret key for JWT token signing | - | Yes |
| `OTP_GATEWAY_URL` | SMS gateway URL for sending OTP | - | Yes |
| `OTP_EXPIRY_MINUTES` | OTP expiration time in minutes | `5` | No |
| `SKIP_OTP_SEND` | Skip SMS sending (dev mode) | `false` | No |

### Development Mode

For local testing without a real SMS gateway, set `SKIP_OTP_SEND=true` in your `.env` file. This will:
- Skip the actual SMS API call
- Log the OTP to the console
- Return the OTP in the API response (for testing)

## Running the Service

### Development Mode
```bash
npm run dev
```
Uses nodemon for auto-restart on file changes.

### Production Mode
```bash
npm start
```

The service will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

Base URL: `http://localhost:3000/api/auth`

### 1. Password-based Signup

Create a new user account with password.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "officer_id": "OFF123",
  "phone_number": "9876543210",
  "password": "SecurePassword123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "officer_id": "OFF123",
    "phone_number": "9876543210"
  }
}
```

### 2. Password-based Login

Login with phone number and password.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "phone_number": "9876543210",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "officer_id": "OFF123",
    "phone_number": "9876543210"
  }
}
```

### 3. Request OTP

Request an OTP for login or signup. For existing users, only `phone_number` is required. For new users, `name` and `officer_id` are also required.

**Endpoint:** `POST /api/auth/request-otp`

**Request Body (Existing User):**
```json
{
  "phone_number": "9876543210"
}
```

**Request Body (New User):**
```json
{
  "phone_number": "9876543210",
  "name": "John Doe",
  "officer_id": "OFF123"
}
```

**Response (200 OK) - Production:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Response (200 OK) - Development Mode:**
```json
{
  "success": true,
  "message": "OTP generated (DEV MODE - SMS skipped)",
  "otp": "123456"
}
```

### 4. Verify OTP

Verify the OTP and complete login/signup. Returns a JWT token upon successful verification.

**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "phone_number": "9876543210",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "officer_id": "OFF123",
    "phone_number": "9876543210"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid OTP or expired OTP:
```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

- **400 Bad Request** - No active OTP:
```json
{
  "success": false,
  "message": "No active OTP for this number"
}
```

### 5. Get User Profile (Protected)

Get the authenticated user's profile. Requires a valid JWT token.

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "officer_id": "OFF123",
    "phone_number": "9876543210",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

## Testing with Postman

### OTP Flow (Recommended for Testing)

1. **Request OTP:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/auth/request-otp`
   - Body (JSON):
     ```json
     {
       "phone_number": "9876543210",
       "name": "Test User",
       "officer_id": "TEST123"
     }
     ```
   - In dev mode, you'll receive the OTP in the response

2. **Verify OTP:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/auth/verify-otp`
   - Body (JSON):
     ```json
     {
       "phone_number": "9876543210",
       "otp": "123456"
     }
     ```
   - Copy the `token` from the response

3. **Get Profile:**
   - Method: `GET`
   - URL: `http://localhost:3000/api/auth/profile`
   - Headers:
     - Key: `Authorization`
     - Value: `Bearer <your_token>`

### Password Flow

1. **Signup:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/auth/signup`
   - Body (JSON):
     ```json
     {
       "name": "Test User",
       "officer_id": "TEST123",
       "phone_number": "9876543210",
       "password": "Test123456"
     }
     ```

2. **Login:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/auth/login`
   - Body (JSON):
     ```json
     {
       "phone_number": "9876543210",
       "password": "Test123456"
     }
     ```

## Project Structure

```
auth/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   └── authController.js    # Authentication logic (signup, login, OTP)
├── middleware/
│   ├── auth.js              # JWT token verification middleware
│   └── validation.js        # Request validation middleware
├── Models/
│   └── User.js              # User schema and model
├── routes/
│   └── authRoutes.js        # API route definitions
├── schemas/
│   └── authSchemas.js       # Joi validation schemas
├── utils/
│   └── jwt.js               # JWT token generation and verification
├── app.js                    # Express app setup
├── env.sample                # Environment variables template
└── package.json              # Dependencies and scripts
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (in development)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors, invalid OTP, etc.)
- `401` - Unauthorized (missing/invalid token)
- `500` - Internal Server Error
- `502` - Bad Gateway (SMS gateway failure)

## Security Features

- Password hashing using bcrypt (10 rounds)
- JWT tokens with configurable expiration (default: 7 days)
- Input validation on all endpoints
- OTP expiration (default: 5 minutes)
- Unique constraints on phone_number and officer_id

## SMS Gateway Integration

The service integrates with an SMS gateway for OTP delivery. The gateway URL format:

```
http://msg.com:8080/smsc/sends msg?from=VAYUVARTA&to=<phone_number>&text=<message>
```

The OTP message format:
```
Your OTP code for Login : <otp> . Regards,
```

## Development Tips

1. **Testing OTP without SMS Gateway:**
   - Set `SKIP_OTP_SEND=true` in `.env`
   - OTP will be logged to console and returned in API response
   - Useful for local development and testing

2. **MongoDB Connection:**
   - Use MongoDB Atlas connection string for cloud database
   - Ensure network access is configured in Atlas
   - For local MongoDB, use: `mongodb://localhost:27017/auth_db`

3. **JWT Secret:**
   - Use a strong, random secret in production
   - Never commit secrets to version control
   - Consider using environment-specific secrets

## License

ISC

## Support

For issues or questions, please contact the development team.
