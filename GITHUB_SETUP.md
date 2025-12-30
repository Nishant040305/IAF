# GitHub Setup Instructions

## Step 1: Add All Files

```bash
cd /Users/anmolsinha/Desktop/IAF
git add .
```

## Step 2: Commit Changes

```bash
git commit -m "feat: Add comprehensive authentication system, sub-admin management, audit logging, and unified auth middleware

- Implemented OTP-based user authentication with read-only access
- Added admin authentication with JWT tokens
- Created sub-admin management system (super admin can create/manage sub-admins)
- Implemented comprehensive audit logging for all admin actions
- Added unified authentication middleware supporting both user and admin tokens
- Updated all routes with proper authentication and authorization
- Added role-based access control (users: read-only, admins: full access)
- Created comprehensive README with full documentation
- Added Postman testing guide
- Updated .gitignore for proper file exclusions"
```

## Step 3: Push to GitHub

### If repository already exists:

```bash
git push origin main
```

### If you need to create a new repository:

1. Go to GitHub and create a new repository
2. Then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/VayuReader.git
git branch -M main
git push -u origin main
```

### If you need to update remote URL:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/VayuReader.git
git push -u origin main
```

## Step 4: Verify

After pushing, verify on GitHub that:
- ✅ README.md is updated
- ✅ All new files are committed
- ✅ .gitignore is working (no node_modules, .env files)
- ✅ All services are properly documented

## Important Notes

1. **Environment Files**: Make sure `.env` files are NOT committed (they should be in .gitignore)
2. **Node Modules**: Should be excluded via .gitignore
3. **Sensitive Data**: Never commit:
   - MongoDB connection strings with passwords
   - JWT secrets
   - API keys
   - Admin credentials

## Creating .env.example Files

For each service, create a `.env.example` file (without actual secrets):

```bash
# Example: VayuReader_Backend/admin_auth/.env.example
ADMIN_NAME=Your Admin Name
ADMIN_CONTACT=Your Contact
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRY_DAYS=1
ADMIN_AUTH_PORT=3012
MONGODB_URI=your-mongodb-uri
USER_JWT_SECRET=your-user-jwt-secret
```

