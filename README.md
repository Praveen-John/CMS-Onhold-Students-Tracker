# CMS On-Hold Students Tracker

A secure, full-stack web application for educational organizations to track and manage students on hold, with automated email reminders and comprehensive analytics.

## ✨ Features

- **🔐 Secure Authentication**
  - Google OAuth 2.0 (default) - One-click secure login
  - Simple email-based login (optional, for testing)
  - Session persistence across browser refreshes
  - Role-based access control (Admin vs User)

- **📊 Analytics Dashboard**
  - Visual overview of student statuses
  - Real-time statistics and metrics
  - Customizable date range filters

- **📋 Comprehensive Student Management**
  - Add, edit, and delete student records
  - Advanced search and filtering capabilities
  - Sort by multiple criteria
  - Admin-only delete functionality

- **🔔 Automated Email Reminders**
  - Configurable reminder times (10 AM, 1 PM, 4 PM, 6 PM, 8 PM)
  - Instant notification when new students are added
  - Centralized email dispatch to operations team
  - Toggle reminders on/off per student

- **🛡️ Field-Level Encryption**
  - AES-256-GCM encryption for sensitive data
  - Encrypted fields: `phoneNumber`, `registeredMailId`, `reasonToHold`, `followUpComments`
  - Automatic decryption when retrieving data

- **📝 Activity Logging**
  - Track all user actions (login, logout, CRUD operations)
  - Audit trail for compliance and monitoring

- **🎨 Modern UI/UX**
  - Dark mode support
  - Responsive design
  - Real-time data updates

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** Google OAuth 2.0, JWT
- **Email:** Nodemailer with Gmail OAuth2
- **Encryption:** Node.js crypto (AES-256-GCM)

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v20.x or later)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- Google Cloud Project (for OAuth and email)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd CMS-Onhold-Students-Tracker
npm install
```

### 2. Environment Setup

Create `.env` file from the sample:
```bash
cp .env.sample .env
```

Create `.env.local` for frontend:
```bash
cp .env.local.sample .env.local
```

### 3. Configure Environment Variables

**Backend (.env):**
```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/cms-tracker

# Server
PORT=5000
NODE_ENV=development

# Google OAuth (Get from https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=f"{BASE_URL}/callback"

# Security Secrets (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
ENCRYPTION_KEY=your-64-char-hex-key

# Email (Gmail OAuth2)
EMAIL_USER=your-email@gmail.com
EMAIL_CLIENT_ID=your-email-client-id
EMAIL_CLIENT_SECRET=your-email-client-secret
EMAIL_REFRESH_TOKEN=your-refresh-token

# AI (Optional)
GEMINI_API_KEY=your-gemini-api-key
```

**Frontend (.env.local):**
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 4. Generate Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Encryption Key (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Run the Application

```bash
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## 🔑 Switching Login Methods

To switch between Google OAuth and simple email login:

**Edit `login.config.js`:**

```javascript
const LOGIN_TYPE = 'oauth';   // Google OAuth (recommended)
// const LOGIN_TYPE = 'simple'; // Email-only (for testing)
```

Then restart the dev server.

## 👥 Default Admin Users

These users automatically get admin access on first login **for both login methods**:
- `praveen_k@lmes.in`
- `nawinrexroy_j@lmes.in`

### Admin Access by Login Method:

#### Google OAuth Login (`oauth`)
- ✅ Admins hardcoded in backend ([server.js](server.js))
- ✅ Admin status stored in MongoDB
- ✅ Can be changed via User Management panel
- ✅ Persists across sessions

#### Simple Email Login (`simple`)
- ✅ Same admin users as OAuth
- ✅ Backend endpoint validates admin status
- ✅ Creates user document in MongoDB
- ✅ Full session persistence with JWT tokens
- ⚠️ For testing/development only

**Note:** Both login methods use the same admin user list and create users in MongoDB, so admin access is consistent across both methods.

To add more admins, use the User Management panel in Settings.

## 📧 Setting Up Gmail OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Gmail API** (APIs & Services > Library)
4. Configure OAuth 2.0 consent screen
5. Create OAuth 2.0 credentials:
   - **Web Application**
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
6. Generate refresh token using [oauth2l](https://github.com/google/oauth2l) or [this guide](https://www.youtube.com/watch?v=9MsJ8q5de4A)

## 🔒 Decryption Tool

To manually decrypt sensitive data:

```bash
node decrypt.cjs "iv:authTag:encryptedData"
```

Example:
```bash
# Get encrypted data from MongoDB
db.students.findOne({}, {phoneNumber: 1})

# Decrypt it
node decrypt.cjs "a1b2c3d4e5f6g7h8:q1w2e3r4t5y6u7i8:m3n4o5p6q7r8s9t0..."
```

## 🏗️ Building for Production

```bash
npm run build
```

Serve the `dist` folder with a static file server and proxy `/api` requests to the backend.

## 📁 Project Structure

```
├── components/          # React components
│   ├── OAuthLoginScreen.tsx
│   ├── LoginScreen.tsx
│   ├── StudentForm.tsx
│   ├── StudentTable.tsx
│   └── ...
├── server.js           # Express backend with encryption
├── App.tsx             # Main React component
├── types.ts            # TypeScript definitions
├── login.config.js     # Login method configuration
├── decrypt.js          # Manual decryption tool
└── .env                # Environment variables (not in git)
```

## 🔐 Security Features

- **Authentication:** Google OAuth 2.0 with JWT tokens
- **Encryption:** AES-256-GCM for sensitive fields
- **Session Management:** HTTP-only cookies
- **CORS:** Configured for specific origins
- **Domain Restriction:** Only `@lmes.in` emails allowed
- **Audit Trail:** All actions logged

## 🧪 Testing

After setup:
1. ✅ Login with your `@lmes.in` Google account
2. ✅ Verify user is created in MongoDB `users` collection
3. ✅ Check that admins see "User Management" in Settings
4. ✅ Create a test student - verify encryption in MongoDB
5. ✅ Toggle reminders and test email notifications
6. ✅ Logout and login again to test session persistence

## 🐛 Troubleshooting

### "Redirect URI mismatch" error
Add your exact URL to Google Console authorized redirect URIs

### "Unauthorized domain" error
Ensure your email ends with `@lmes.in`

### Cookies not being set
- Verify `CLIENT_URL` matches your frontend URL exactly
- Check HTTP in development, HTTPS in production

### Cannot decrypt data
- Ensure `ENCRYPTION_KEY` is the same 64-char hex string used for encryption
- Never lose this key - encrypted data will be permanently unreadable

## 📚 API Endpoints

### Authentication
- `POST /api/auth/simple-login` - Simple email login (testing)
- `POST /api/auth/google/verify` - Verify Google OAuth token
- `POST /api/auth/google/verify-token` - Verify user info
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Students
- `GET /api/students` - Get all students (decrypted)
- `POST /api/students` - Add new student (encrypts sensitive data)
- `PUT /api/students/:id` - Update student (encrypts sensitive data)
- `DELETE /api/students/:id` - Delete student (admin only)

### Users (Admin)
- `GET /api/users` - Get all users
- `PUT /api/users/:id/admin` - Grant/revoke admin

### Activities
- `GET /api/activities` - Get activity log
- `POST /api/activities` - Log activity

### Admin
- `POST /api/admin/decrypt` - Manually decrypt data

## 📞 Support

For issues or questions:
1. Check server console logs
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Ensure MongoDB connection is working

## 📝 License

Nil

---

**Built with ❤️ for educational organizations**
