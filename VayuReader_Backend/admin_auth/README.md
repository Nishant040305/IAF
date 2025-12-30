# Admin Authentication Service

A standalone JWT-based authentication service for admin users.

## Features

- JWT-based authentication
- Admin login with name and contact
- Token verification middleware
- Standalone service (can run independently)

## Installation

```bash
cd VayuReader_Backend/admin_auth
npm install
```

## Configuration

Create a `.env` file in this directory with the following variables:

```env
ADMIN_NAME=Himanshu Bhatt
ADMIN_CONTACT=89200 67341
JWT_SECRET=admin-secret-key-change-this
JWT_EXPIRY_DAYS=1
ADMIN_AUTH_PORT=3002
```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The service will run on port 3002 (or the port specified in `ADMIN_AUTH_PORT`).

## API Endpoints

### Health Check
- **GET** `/health`
- Returns service status

### Login
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "name": "Himanshu Bhatt",
    "contact": "89200 67341"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "name": "Himanshu Bhatt",
      "contact": "89200 67341"
    }
  }
  ```

## Usage as a Module

This service can also be used as a module in other Node.js applications:

```javascript
const { loginAdmin, verifyAdminToken } = require('./admin_auth/adminAuthController');

// Use verifyAdminToken as middleware
router.post('/protected-route', verifyAdminToken, (req, res) => {
  // req.admin contains the decoded token
  res.json({ message: 'Protected route', admin: req.admin });
});
```

## Dependencies

- `express` - Web framework
- `jsonwebtoken` - JWT token generation and verification
- `dotenv` - Environment variable management
- `cors` - Cross-origin resource sharing

