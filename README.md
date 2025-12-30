# VayuReader 📚

> A comprehensive multi-platform solution for PDF management, document search, and content discovery with advanced authentication and admin management

[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-49.0.0-black.svg?logo=expo)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend%20Framework-black.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green.svg?logo=mongodb)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg?logo=jsonwebtokens)](https://jwt.io/)

VayuReader is a powerful, multi-module platform designed for seamless PDF document management, intelligent search capabilities, and comprehensive content organization. The platform combines a mobile-first approach with robust backend services and an intuitive admin dashboard.

---

## ✨ Key Features

- 📱 **Android Mobile App** – Built with React Native (Expo) for Android platform
- 🔍 **Intelligent PDF Search** - Advanced search engine with full-text indexing
- 📖 **Dictionary Integration** - Built-in dictionary with synonyms and antonyms  
- 🔤 **Abbreviation Management** - Comprehensive abbreviation lookup system
- 🔐 **Secure Authentication** - OTP-based user authentication and JWT-based admin authentication
- 👨‍💼 **Admin Dashboard** - Web-based content management interface with role-based access
- 👥 **Sub-Admin Management** - Super admin can create and manage sub-admins
- 📊 **Audit Logging** - Complete activity tracking for all admin actions
- 🔒 **Role-Based Access Control** - Users (read-only), Admins (full access)
- ☁️ **Cloud-Ready** - Scalable microservices architecture

---

## 🏗️ Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Mobile App        │    │   Backend APIs      │    │   Admin Dashboard   │
│   (React Native)    │◄──►│   (Node.js/Express) │◄──►│   (React/Tailwind)  │
│                     │    │                     │    │                     │
│ • PDF Viewer        │    │ • PDF Search        │    │ • Content Management│
│ • Search Interface  │    │ • Authentication    │    │ • User Management   │
│ • Dictionary        │    │ • Abbreviations     │    │ • Sub-Admin Mgmt    │
│ • Abbreviations     │    │ • Dictionary API    │    │ • Audit Logs        │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │   MongoDB Atlas     │
                           │   (Database)        │
                           └─────────────────────┘
```

---

## 📂 Project Structure

```
VayuReader/
├── 📱 VayuReader_Frontend/          # Mobile Application
│   ├── app/                         # File-based routing
│   ├── components/                  # Reusable UI components
│   ├── services/                    # API integration
│   └── assets/                      # Images, fonts, etc.
│
├── 🖥️ VayuReader_Backend/           # Backend Services
│   ├── pdf-search-engine/           # PDF management & search (Port 3005)
│   ├── abrebiations/                # Abbreviation API (Port 3001)
│   ├── dictionary-api/              # Dictionary service (Port 3000)
│   ├── auth/                        # User OTP authentication (Port 3010)
│   ├── admin_auth/                  # Admin authentication & management (Port 3012)
│   │   ├── middleware/              # Unified authentication middleware
│   │   ├── controllers/             # Sub-admin management
│   │   ├── models/                  # Audit logs, Sub-admins
│   │   └── routes/                  # Audit routes, Sub-admin routes
│   └── shared/                      # Common utilities
│
└── 🌐 VayuReader_AdminDashboard/    # Web Admin Interface
    ├── frontend/                    # React dashboard
    │   ├── components/              # Dashboard components
    │   │   ├── ManageAbbreviations.jsx
    │   │   ├── ManagePDFs.jsx
    │   │   ├── ManageDictionaryWords.jsx
    │   │   └── ManageSubAdmins.jsx
    │   └── services/                # Admin API calls
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- MongoDB 6.0+ (or MongoDB Atlas)
- Expo CLI
- Git
- Docker & Docker Compose (optional, for containerized deployment)

---

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/VayuReader.git
   cd VayuReader
   ```

2. **Backend Setup**

   Each service needs to be set up individually:

   ```bash
   # 1. Auth Service (User OTP Authentication)
   cd VayuReader_Backend/auth
   npm install
   cp env.sample .env
   # Edit .env with your MongoDB URI and JWT_SECRET
   npm run dev  # Runs on port 3010

   # 2. Admin Auth Service
   cd ../admin_auth
   npm install
   # Create .env file (see Configuration section)
   npm run dev  # Runs on port 3012

   # 3. Abbreviations Service
   cd ../abrebiations
   npm install
   # Create .env with MONGODB_URI
   npm run dev  # Runs on port 3001

   # 4. PDF Search Engine
   cd ../pdf-search-engine
   npm install
   # Create .env with MONGODB_URI
   npm run dev  # Runs on port 3005

   # 5. Dictionary API
   cd ../dictionary-api
   npm install
   # Create .env with MONGODB_URI
   npm run dev  # Runs on port 3000
   ```

3. **Admin Dashboard Setup**
   ```bash
   cd VayuReader_AdminDashboard/frontend
   npm install
   npm start
   ```

4. **Mobile App Setup**
   See detailed instructions in [Mobile App Setup](#-mobile-app-setup) section below.

---

## 🔧 Configuration

### Environment Variables

#### Auth Service (`VayuReader_Backend/auth/.env`)
```env
PORT=3010
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRY_DAYS=1
OTP_EXPIRY_MINUTES=5
OTP_GATEWAY_URL=http://msg.com:8080/smsc/sends msg
SKIP_OTP_SEND=true  # Set to true for development
```

#### Admin Auth Service (`VayuReader_Backend/admin_auth/.env`)
```env
ADMIN_NAME=Himanshu Bhatt
ADMIN_CONTACT=89200 67341
JWT_SECRET=admin-secret-key-change-this
JWT_EXPIRY_DAYS=1
ADMIN_AUTH_PORT=3012
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
USER_JWT_SECRET=change_me  # Should match JWT_SECRET from auth service
```

#### Other Services
Each service needs:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
PORT=<service_port>
```

---

## 🔐 Authentication & Authorization

### User Authentication (OTP-Based)

Users authenticate using OTP sent to their phone number:

1. **Request OTP**
   ```bash
   POST http://localhost:3010/api/auth/login/request-otp
   Body: { "name": "User Name", "phone_number": "9876543210" }
   ```

2. **Verify OTP**
   ```bash
   POST http://localhost:3010/api/auth/login/verify-otp
   Body: { "phone_number": "9876543210", "otp": "123456" }
   Response: { "token": "jwt_token", "user": {...} }
   ```

**User Permissions**: Read-only access (GET requests only)

### Admin Authentication

Admins authenticate with name and contact:

```bash
POST http://localhost:3012/api/auth/login
Body: { "name": "Himanshu Bhatt", "contact": "89200 67341" }
Response: { "token": "jwt_token", "admin": {...} }
```

**Admin Permissions**: Full access (GET, POST, PUT, DELETE)

### Sub-Admin Management

Super admin can create and manage sub-admins:

```bash
# Get all sub-admins (Super admin only)
GET http://localhost:3012/api/sub-admins
Headers: Authorization: Bearer <super_admin_token>

# Create sub-admin (Super admin only)
POST http://localhost:3012/api/sub-admins
Body: { "name": "Sub Admin", "contact": "1234567890" }

# Delete sub-admin (Super admin only)
DELETE http://localhost:3012/api/sub-admins/<id>
```

**Sub-Admin Permissions**: Same as super admin (full access to content, but cannot manage other admins)

---

## 📊 Audit Logging

All admin actions are automatically logged:

```bash
# Get audit logs
GET http://localhost:3012/api/audit/logs?page=1&limit=50
Headers: Authorization: Bearer <admin_token>

# Get audit statistics
GET http://localhost:3012/api/audit/stats
Headers: Authorization: Bearer <admin_token>
```

Audit logs track:
- Action type (CREATE, UPDATE, DELETE)
- Resource type (ABBREVIATION, PDF, DICTIONARY_WORD)
- Admin information (name, contact)
- Timestamp
- Resource details

---

## 🔌 API Documentation

### Service Ports

| Service | Port | Base URL |
|---------|------|----------|
| Auth Service | 3010 | `http://localhost:3010` |
| Admin Auth Service | 3012 | `http://localhost:3012` |
| Abbreviations Service | 3001 | `http://localhost:3001` |
| PDF Service | 3005 | `http://localhost:3005` |
| Dictionary Service | 3000 | `http://localhost:3000` |

### API Endpoints

#### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login/request-otp` | POST | None | Request OTP for user login |
| `/api/auth/login/verify-otp` | POST | None | Verify OTP and get user token |
| `/api/auth/login` | POST | None | Admin login |

#### Abbreviations

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/abbreviations/:abbr` | GET | User/Admin | Get abbreviation by name |
| `/api/abbreviations/all` | GET | User/Admin | Get all abbreviations |
| `/api/abbreviations` | POST | Admin | Create abbreviation |
| `/api/abbreviations/:id` | PUT | Admin | Update abbreviation |
| `/api/abbreviations/:id` | DELETE | Admin | Delete abbreviation |

#### PDFs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/pdfs` | GET | User/Admin | Search PDFs |
| `/api/pdfs/all` | GET | User/Admin | Get all PDFs |
| `/api/pdfs/:id` | GET | User/Admin | Get PDF by ID |
| `/api/pdfs/upload` | POST | Admin | Upload PDF |
| `/api/pdfs/:id` | PUT | Admin | Update PDF |
| `/api/pdfs/:id` | DELETE | Admin | Delete PDF |

#### Dictionary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/dictionary/word/:word` | GET | User/Admin | Get word definition |
| `/api/dictionary/words` | GET | User/Admin | Get word list |
| `/api/dictionary/words/all` | GET | User/Admin | Get all words |
| `/api/dictionary/search/:term` | GET | User/Admin | Search words |
| `/api/dictionary` | POST | Admin | Add word |
| `/api/dictionary/:id` | PUT | Admin | Update word |
| `/api/dictionary/:id` | DELETE | Admin | Delete word |

#### Sub-Admin Management (Super Admin Only)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/sub-admins` | GET | Super Admin | Get all sub-admins |
| `/api/sub-admins` | POST | Super Admin | Create sub-admin |
| `/api/sub-admins/:id` | DELETE | Super Admin | Delete sub-admin |

#### Audit Logs (Admin Only)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/audit/logs` | GET | Admin | Get audit logs (with filters) |
| `/api/audit/stats` | GET | Admin | Get audit statistics |

---

## 📱 Mobile App Setup

### Prerequisites
1. An Android phone
2. A laptop/PC with the project set up
3. Both devices on the same Wi-Fi or hotspot

### Step-by-Step Instructions

1. **Install the App on Your Phone**
   - Download the APK from the provided link
   - Allow installation from unknown sources
   - Install the app

2. **Start the Development Server**
   ```bash
   cd VayuReader_Frontend
   npx expo start --dev-client
   ```

3. **Connect Your Phone**
   - The app should auto-connect
   - If not, manually enter the connection URL from the terminal

4. **Update Code**
   - No need to reinstall
   - Just restart the dev server and reopen the app

5. **Rebuild App** (only when needed)
   ```bash
   eas build --platform android --profile development
   ```

---

## 🧪 Testing

See [POSTMAN_TESTING_GUIDE.md](VayuReader_Backend/POSTMAN_TESTING_GUIDE.md) for comprehensive API testing instructions.

### Quick Test Checklist

- [ ] User can request and verify OTP
- [ ] User can read data (GET requests)
- [ ] User cannot write data (POST/PUT/DELETE - should get 403)
- [ ] Admin can login
- [ ] Admin can perform all operations
- [ ] Super admin can manage sub-admins
- [ ] Sub-admins cannot manage other admins
- [ ] Audit logs are being recorded

---

## 🛠️ Technology Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **NativeWind** - Tailwind CSS for React Native
- **React Navigation** - Navigation library
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **bcrypt** - Password hashing (for legacy)
- **Docker** - Containerization

### Admin Dashboard
- **React** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client

---

## 🐳 Docker Deployment

### Build and Run All Services

```bash
cd VayuReader_Backend
docker-compose up --build
```

### Individual Service Dockerfiles

Each service has its own Dockerfile for independent deployment.

---

## 🚢 Deployment

### Backend Services
Deploy to cloud providers (AWS, GCP, Azure, Render, etc.)

### Frontend
Build and deploy using Expo EAS

### Admin Dashboard
Deploy to Vercel, Netlify, or similar platform

---

## 📝 Features Breakdown

### 🔍 Search Engine
- Full-text search across PDF content
- Advanced query syntax support
- Search result ranking and relevance

### 📚 Content Management
- Bulk PDF upload and processing
- Metadata management
- File organization and categorization

### 👥 User Management
- OTP-based user authentication
- Admin and sub-admin management
- Role-based access control

### 📊 Audit & Monitoring
- Complete activity logging
- Admin action tracking
- Statistics and reporting

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

## 🎯 Roadmap

- [ ] AI-powered content recommendations
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Integration with cloud storage providers
- [ ] Voice search capabilities
- [ ] Collaborative annotation features
- [ ] Real-time notifications
- [ ] Advanced search filters

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

Built with ❤️ for the Indian Air Force community

---

## 📚 Additional Documentation

- [Postman Testing Guide](VayuReader_Backend/POSTMAN_TESTING_GUIDE.md)
- [Admin Auth Service README](VayuReader_Backend/admin_auth/README.md)
- [Auth Service README](VayuReader_Backend/auth/README.md)

---

<div align="center">
  <strong>Built with ❤️ for the Indian Air Force community</strong>
</div>
