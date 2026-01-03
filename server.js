console.log('--- SERVER.JS EXECUTION START ---');
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import 'dotenv/config';

console.log('--- IMPORTS LOADED ---');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', process.env.CLIENT_URL].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

console.log('--- MIDDLEWARE INITIALIZED ---');

// --- CONFIGURATION CHECKS ---
const {
    MONGO_URI,
    EMAIL_USER,
    EMAIL_CLIENT_ID,
    EMAIL_CLIENT_SECRET,
    EMAIL_REFRESH_TOKEN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    JWT_SECRET,
    ENCRYPTION_KEY: ENV_ENCRYPTION_KEY
} = process.env;

// Use ENCRYPTION_KEY from env or generate a random one (WARNING: will reset on server restart)
const ENCRYPTION_KEY = ENV_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

console.log(`--- ENV VARS LOADED ---`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`MONGO_URI is present: ${!!MONGO_URI}`);
console.log(`EMAIL_USER is present: ${!!EMAIL_USER}`);
console.log(`GOOGLE_CLIENT_ID is present: ${!!GOOGLE_CLIENT_ID}`);
console.log(`JWT_SECRET is present: ${!!JWT_SECRET}`);

// --- ENCRYPTION HELPERS ---
const ALGORITHM = 'aes-256-gcm';

// Encrypt sensitive text fields
const encryptText = (text) => {
    if (!text) return '';
    try {
        const iv = crypto.randomBytes(16);
        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        return text;
    }
};

// Decrypt sensitive text fields
const decryptText = (encryptedData) => {
    if (!encryptedData) return '';
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) return encryptedData;

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        return encryptedData;
    }
};

// Hash identifiers (one-way)
const hashIdentifier = async (data) => {
    if (!data) return '';
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(data.toLowerCase().trim(), salt);
};

console.log('--- ENCRYPTION HELPERS INITIALIZED ---');



if (!MONGO_URI) {
    console.error("CRITICAL ERROR: MONGO_URI is missing. The application cannot start without it.");
    // In a serverless environment, throwing an error might be better to halt execution decisively.
    throw new Error("CRITICAL: MONGO_URI environment variable not found.");
}

// --- MONGODB CONNECTION ---
const connectToDatabase = async () => {
    try {
        // The options are simplified for broader compatibility and include Mongoose 6+ defaults
        const opts = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(MONGO_URI, opts);
        console.log('✅✅✅ MongoDB Connection Successful');

    } catch (err) {
        console.error('❌❌❌ MongoDB Connection Error:', err.message);
        // In a local dev environment, you might want the server to exit if it can't connect.
        // In a serverless/production environment, the container would likely crash and restart,
        // which might be the desired behavior.
        process.exit(1);
    }
};

// We will call this function before starting the server
// This replaces the scattered connection logic.


// --- SCHEMAS ---

// User schema for Google OAuth authentication
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: String,
    picture: String,
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});

const studentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    initiatedDate: String,
    studentName: String,
    phoneNumber: String,
    registeredMailId: String,
    category: String,
    heldSchoolSection: String,
    changedToSchoolSection: String,
    reminderDate: String,
    initiatedBy: String,
    team: String,
    reasonToHold: String,
    followUpComments: String,
    status: String,
    createdByEmail: String,
    stopReminders: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const activitySchema = new mongoose.Schema({
    id: String,
    user: String,
    action: String,
    details: String,
    timestamp: String,
    createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);
const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);
console.log('--- SCHEMAS AND MODELS CREATED ---');

// --- PASSPORT GOOGLE OAUTH CONFIGURATION ---

// Check if Google OAuth credentials are configured
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && JWT_SECRET) {
    console.log('--- CONFIGURING GOOGLE OAUTH ---');

    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user exists
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // Update last login
                user.lastLogin = new Date();
                await user.save();
                return done(null, user);
            }

            // Create new user
            const email = profile.emails[0].value;

            // Check if email domain is authorized
            if (!email.endsWith('@lmes.in')) {
                return done(new Error('Unauthorized domain'), null);
            }

            // Check if user should be admin
            const ADMIN_USERS = ['praveen_k@lmes.in', 'nawinrexroy_j@lmes.in', 'gokul_s@lmes.in'];
            const isAdmin = ADMIN_USERS.includes(email.toLowerCase());

            user = await User.create({
                googleId: profile.id,
                email: email,
                name: profile.displayName,
                picture: profile.photos[0]?.value,
                isAdmin: isAdmin
            });

            console.log(`✅ New user created: ${email} ${isAdmin ? '(Admin)' : ''}`);
            return done(null, user);
        } catch (error) {
            console.error('Error in Google OAuth:', error);
            return done(error, null);
        }
    }
    ));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    console.log('✅ GOOGLE OAUTH CONFIGURED');
} else {
    console.warn('⚠️  GOOGLE OAUTH NOT CONFIGURED - Missing credentials');
}

// --- AUTHENTICATION MIDDLEWARE ---

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(token, JWT_SECRET || 'fallback-secret', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// --- AUTH ROUTES ---

// Google OAuth login endpoint
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback endpoint
app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
    async (req, res) => {
        try {
            const user = req.user;

            // Create JWT token
            const token = jwt.sign(
                {
                    id: user._id,
                    email: user.email,
                    isAdmin: user.isAdmin
                },
                JWT_SECRET || 'fallback-secret',
                { expiresIn: '7d' }
            );

            // Set HTTP-only cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Redirect to frontend
            res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
        } catch (error) {
            console.error('Error in OAuth callback:', error);
            res.redirect('/login?error=server_error');
        }
    }
);

// Get current user endpoint
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-googleId');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Simple email login endpoint (for testing/development)
app.post('/api/auth/simple-login', async (req, res) => {
    console.log('Received simple login request');
    try {
        const { email } = req.body;

        if (!email) {
            console.error('Missing email');
            return res.status(400).json({ message: 'Email is required' });
        }

        if (!email.endsWith('@lmes.in')) {
            console.log(`Unauthorized domain attempt: ${email}`);
            return res.status(403).json({ message: 'Unauthorized domain. Only @lmes.in emails allowed.' });
        }

        console.log(`Processing simple login for: ${email}`);

        // Check if user should be admin
        const ADMIN_USERS = ['praveen_k@lmes.in', 'nawinrexroy_j@lmes.in', 'gokul_s@lmes.in'];
        const isAdmin = ADMIN_USERS.includes(email.toLowerCase());

        // Find or create user
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            user = await User.create({
                email: email.toLowerCase(),
                name: email.split('@')[0], // Use email prefix as name
                picture: '',
                isAdmin: isAdmin,
                googleId: `simple_${email.toLowerCase()}` // Mock googleId for simple login
            });
            console.log(`✅ New user created: ${email} ${isAdmin ? '(Admin)' : ''}`);
        } else {
            console.log(`✅ User logged in: ${email} ${user.isAdmin ? '(Admin)' : ''}`);
        }

        // Create JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            email: user.email,
            name: user.name,
            picture: user.picture,
            isAdmin: user.isAdmin
        });
    } catch (error) {
        console.error('Error in simple login:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

// Google token verification endpoint (OAuth 2.0 flow)
app.post('/api/auth/google/verify-token', async (req, res) => {
    console.log('Received token verification request');
    try {
        const { email, name, picture, sub } = req.body;

        if (!email || !sub) {
            console.error('Missing required fields');
            return res.status(400).json({ message: 'Missing required user data' });
        }

        if (!email.endsWith('@lmes.in')) {
            console.log(`Unauthorized domain attempt: ${email}`);
            return res.status(403).json({ message: 'Unauthorized domain. Only @lmes.in emails allowed.' });
        }

        console.log(`Processing OAuth login for: ${email}`);

        let user = await User.findOne({ googleId: sub });

        if (!user) {
            const ADMIN_USERS = ['praveen_k@lmes.in', 'nawinrexroy_j@lmes.in', 'gokul_s@lmes.in'];
            const isAdmin = ADMIN_USERS.includes(email.toLowerCase());

            user = await User.create({
                googleId: sub,
                email: email,
                name: name,
                picture: picture,
                isAdmin: isAdmin
            });

            console.log(`✅ New user created: ${email} ${isAdmin ? '(Admin)' : ''}`);
        } else {
            user.lastLogin = new Date();
            await user.save();
            console.log(`✅ Existing user logged in: ${email}`);
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, isAdmin: user.isAdmin },
            JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            email: user.email,
            name: user.name,
            picture: user.picture,
            isAdmin: user.isAdmin
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ message: 'Authentication failed', error: error.message });
    }
});

// Google Identity Services verification endpoint
app.post('/api/auth/google/verify', async (req, res) => {
    try {
        const { OAuth2Client } = await import('google-auth-library');
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Check domain
        if (!payload.email.endsWith('@lmes.in')) {
            return res.status(403).json({ message: 'Unauthorized domain' });
        }

        // Find or create user
        let user = await User.findOne({ googleId: payload.sub });

        if (!user) {
            const ADMIN_USERS = ['praveen_k@lmes.in', 'nawinrexroy_j@lmes.in', 'gokul_s@lmes.in'];
            const isAdmin = ADMIN_USERS.includes(payload.email.toLowerCase());

            user = await User.create({
                googleId: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                isAdmin: isAdmin
            });

            console.log(`✅ New user created: ${payload.email} ${isAdmin ? '(Admin)' : ''}`);
        } else {
            user.lastLogin = new Date();
            await user.save();
        }

        // Create JWT
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            email: user.email,
            name: user.name,
            picture: user.picture,
            isAdmin: user.isAdmin
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
});

// --- ADMIN USER MANAGEMENT ROUTES ---

// Get all users (admin only)
app.get('/api/users', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-googleId').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
});

// Update user admin status (admin only)
app.put('/api/users/:userId/admin', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { isAdmin } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { isAdmin },
            { new: true }
        ).select('-googleId');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update user', error: err.message });
    }
});

// --- API ROUTES ---

// 1. Get all students
app.get('/api/students', authenticateToken, async (req, res) => {
    console.log('GET /api/students');
    try {
        const students = await Student.find().sort({ createdAt: -1 });

        // Decrypt sensitive fields before sending response
        const decryptedStudents = students.map(student => {
            const studentObj = student.toObject();
            if (studentObj.reasonToHold) studentObj.reasonToHold = decryptText(studentObj.reasonToHold);
            if (studentObj.followUpComments) studentObj.followUpComments = decryptText(studentObj.followUpComments);
            if (studentObj.phoneNumber) studentObj.phoneNumber = decryptText(studentObj.phoneNumber);
            if (studentObj.registeredMailId) studentObj.registeredMailId = decryptText(studentObj.registeredMailId);
            return studentObj;
        });

        res.json(decryptedStudents);
    } catch (err) {
        console.error('Error in GET /api/students:', err.message);
        res.status(500).json({ message: "Failed to fetch students", error: err.message });
    }
});

// 2. Add a student
app.post('/api/students', authenticateToken, async (req, res) => {
    console.log('POST /api/students');
    try {
        const exists = await Student.findOne({ id: req.body.id });
        if (exists) {
            return res.status(400).json({ message: "Student ID already exists" });
        }

        // Encrypt sensitive fields before saving
        const studentData = {
            ...req.body,
            reasonToHold: req.body.reasonToHold ? encryptText(req.body.reasonToHold) : '',
            followUpComments: req.body.followUpComments ? encryptText(req.body.followUpComments) : '',
            phoneNumber: req.body.phoneNumber ? encryptText(req.body.phoneNumber) : req.body.phoneNumber,
            registeredMailId: req.body.registeredMailId ? encryptText(req.body.registeredMailId) : req.body.registeredMailId
        };

        const newStudent = new Student(studentData);
        const savedStudent = await newStudent.save();

        // Decrypt sensitive fields before sending response
        const responseStudent = savedStudent.toObject();
        if (responseStudent.reasonToHold) responseStudent.reasonToHold = decryptText(responseStudent.reasonToHold);
        if (responseStudent.followUpComments) responseStudent.followUpComments = decryptText(responseStudent.followUpComments);
        if (responseStudent.phoneNumber) responseStudent.phoneNumber = decryptText(responseStudent.phoneNumber);
        if (responseStudent.registeredMailId) responseStudent.registeredMailId = decryptText(responseStudent.registeredMailId);

        res.status(201).json(responseStudent);
    } catch (err) {
        console.error('Error in POST /api/students:', err.message);
        res.status(400).json({ message: "Failed to add student", error: err.message });
    }
});

// 3. Update a student
app.put('/api/students/:id', authenticateToken, async (req, res) => {
    console.log(`PUT /api/students/${req.params.id}`);
    try {
        // Encrypt sensitive fields if they're being updated
        const updateData = {
            ...req.body,
            reasonToHold: req.body.reasonToHold ? encryptText(req.body.reasonToHold) : req.body.reasonToHold,
            followUpComments: req.body.followUpComments ? encryptText(req.body.followUpComments) : req.body.followUpComments,
            phoneNumber: req.body.phoneNumber ? encryptText(req.body.phoneNumber) : req.body.phoneNumber,
            registeredMailId: req.body.registeredMailId ? encryptText(req.body.registeredMailId) : req.body.registeredMailId
        };

        const updatedStudent = await Student.findOneAndUpdate(
            { id: req.params.id },
            updateData,
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Decrypt sensitive fields before sending response
        const responseStudent = updatedStudent.toObject();
        if (responseStudent.reasonToHold) responseStudent.reasonToHold = decryptText(responseStudent.reasonToHold);
        if (responseStudent.followUpComments) responseStudent.followUpComments = decryptText(responseStudent.followUpComments);
        if (responseStudent.phoneNumber) responseStudent.phoneNumber = decryptText(responseStudent.phoneNumber);
        if (responseStudent.registeredMailId) responseStudent.registeredMailId = decryptText(responseStudent.registeredMailId);

        res.json(responseStudent);
    } catch (err) {
        console.error(`Error in PUT /api/students/${req.params.id}:`, err.message);
        res.status(500).json({ message: "Failed to update student", error: err.message });
    }
});

// 4. Delete a student
app.delete('/api/students/:id', authenticateToken, async (req, res) => {
    console.log(`DELETE /api/students/${req.params.id}`);
    try {
        const result = await Student.findOneAndDelete({ id: req.params.id });
        if (!result) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        console.error(`Error in DELETE /api/students/${req.params.id}:`, err.message);
        res.status(500).json({ message: "Failed to delete student", error: err.message });
    }
});

// 5. Get activities
app.get('/api/activities', authenticateToken, async (req, res) => {
    console.log('GET /api/activities');
    try {
        const activities = await Activity.find().sort({ createdAt: -1 }).limit(1000);
        res.json(activities);
    } catch (err) {
        console.error('Error in GET /api/activities:', err.message);
        res.status(500).json({ message: "Failed to fetch activities", error: err.message });
    }
});

// 6. Log activity
app.post('/api/activities', authenticateToken, async (req, res) => {
    console.log('POST /api/activities');
    try {
        const newActivity = new Activity(req.body);
        const savedActivity = await newActivity.save();
        res.status(201).json(savedActivity);
    } catch (err) {
        console.error('Error in POST /api/activities:', err.message);
        res.status(400).json({ message: "Failed to log activity", error: err.message });
    }
});

// Helper to generate HTML table for emails
const generateEmailTable = (students, title, agentName) => {
    const rows = students.map(s => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.studentName}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.phoneNumber || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.category}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.reasonToHold || 'N/A'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.reminderDate}</td>
        </tr>
    `).join('');

    return `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #6d28d9;">Hello ${agentName},</h2>
            <p>You have pending follow-ups for the following students as of <strong>${title}</strong>:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f3f4f6;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Phone</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Category</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Reason</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Reminder Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Generated by CMS Tracker System</p>
        </div>
    `;
};

// Helper to log activity from the server
const logActivity = async (action, details, user = 'SYSTEM') => {
    try {
        const newActivity = new Activity({
            id: Date.now().toString(),
            user,
            action,
            details,
            timestamp: new Date().toLocaleString()
        });
        await newActivity.save();
        console.log(`Activity logged: ${action} - ${details}`);
    } catch (e) {
        console.error("Failed to log activity from server", e);
    }
};

// --- EMAIL RETRY MECHANISM ---
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`CRON: Email sent on attempt ${attempt} to ${mailOptions.to}`);
            return { success: true, info };
        } catch (error) {
            console.error(`CRON: Email attempt ${attempt} failed for ${mailOptions.to}:`, error.message);
            if (attempt === maxRetries) {
                return { success: false, error: error.message };
            }
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
    }
};

// --- CRON JOB ENDPOINT ---
app.get('/api/cron/send-reminders', async (req, res) => {
    console.log('CRON /api/cron/send-reminders');
    console.log(`CRON: Job started at ${new Date().toISOString()} (UTC: ${new Date().toUTCString()})`);
    console.log(`CRON: Local timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    // 1. Authenticate Cron Job
    const authHeader = req.headers.authorization;
    console.log('CRON: Auth header received:', authHeader ? 'Yes' : 'No');
    console.log('CRON: CRON_SECRET exists:', process.env.CRON_SECRET ? 'Yes' : 'No');
    console.log('CRON: Auth header matches secret:', authHeader === `Bearer ${process.env.CRON_SECRET}` ? 'Yes' : 'No');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('CRON: Unauthorized access attempt.');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // 2. Connect to DB
        console.log('CRON: Database connected.');

        // 3. Fetch students who need reminders
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;


        // Status enum values from types.ts
        const ON_HOLD = 'On hold';
                const PENDING = 'Pending';
        
                const studentsToRemind = await Student.find({
                    stopReminders: { $ne: true },
                    reminderDate: { $lte: todayStr },
                    status: { $in: [ON_HOLD, PENDING] }
                });
        
                if (studentsToRemind.length === 0) {
                    console.log('CRON: No students require reminders today.');
                    await logActivity('CRON_JOB', 'Ran successfully, no reminders to send.');
                    return res.status(200).json({ message: "No reminders to send." });
                }
                console.log(`CRON: Found ${studentsToRemind.length} students to remind.`);

        // 4. Group students by agent
        const tasksByAgent = {};
        studentsToRemind.forEach(s => {
            const agent = s.initiatedBy || 'Unassigned';
            if (!tasksByAgent[agent]) tasksByAgent[agent] = [];
            tasksByAgent[agent].push(s);
        });
        
        // 5. Send emails
        if (!transporter) {
            console.log('CRON: Transporter not initialized, creating a new one.');
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: EMAIL_USER,
                    clientId: EMAIL_CLIENT_ID,
                    clientSecret: EMAIL_CLIENT_SECRET,
                    refreshToken: EMAIL_REFRESH_TOKEN,
                },
            });
        }

        if (!EMAIL_USER || !EMAIL_CLIENT_ID) {
            console.error("CRON: Email service is not configured.");
            return res.status(500).json({ message: "Email service not configured on server." });
        }

        let sentCount = 0;
        let failedCount = 0;
        const agents = Object.keys(tasksByAgent);
        
        for (const agentName of agents) {
            const agentTasks = tasksByAgent[agentName];
            const emailBody = generateEmailTable(agentTasks, new Date().toDateString(), agentName);
            const subject = `[Reminder] Automated Follow-up for ${agentTasks.length} students`;

            // Standardize routing to operations team with agent context in subject
            const mailOptions = {
                from: `"CMS Tracker" <${EMAIL_USER}>`,
                to: "gokul_s@lmes.in", // Route all reminders to operations team
                subject: `[${agentName}] ${subject}`, // Include agent name in subject for context
                html: emailBody,
            };

            console.log(`CRON: Sending email for agent ${agentName} (${agentTasks.length} students) to operations team`);

            const result = await sendEmailWithRetry(mailOptions);
            if (result.success) {
                console.log(`CRON: Email sent successfully for agent ${agentName}. Message ID: ${result.info.messageId}`);
                sentCount++;
            } else {
                console.error(`CRON: All retries failed for agent ${agentName}: ${result.error}`);
                failedCount++;
            }
        }
        
        const summary = `CRON: Reminder job finished. Sent: ${sentCount}, Failed: ${failedCount}.`;
        console.log(summary);
        await logActivity('CRON_JOB', summary);

        res.status(200).json({ message: 'Cron job completed.', sent: sentCount, failed: failedCount });

    } catch (error) {
        console.error('CRON: An unexpected error occurred:', error.message);
        await logActivity('CRON_JOB_FAILED', `Error: ${error.message}`);
        res.status(500).json({ message: 'Cron job failed.', error: error.message });
    }
});

console.log('--- API ROUTES DEFINED ---');

// --- EMAIL SERVICE (OAuth2) ---

let transporter;
if (EMAIL_USER && EMAIL_CLIENT_ID) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: EMAIL_USER,
            clientId: EMAIL_CLIENT_ID,
            clientSecret: EMAIL_CLIENT_SECRET,
            refreshToken: EMAIL_REFRESH_TOKEN,
        },
    });
    console.log('--- NODEMAILER TRANSPORTER CREATED ---');
} else {
    console.log('--- SKIPPING NODEMAILER TRANSPORTER CREATION (missing env vars) ---');
}


app.post('/api/send-email', authenticateToken, authenticateAdmin, async (req, res) => {
    console.log('POST /api/send-email');
    const { to, subject, htmlBody } = req.body;

    if (!to || !subject || !htmlBody) {
        return res.status(400).json({ message: 'Missing required email fields: to, subject, or htmlBody' });
    }
    
    if (!transporter) {
        console.error("Email service is not configured because transporter is not initialized.");
        return res.status(500).json({ message: "Email service is not configured on the server." });
    }

    const mailOptions = {
        from: `"CMS Tracker" <${EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: htmlBody,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to: ${to}`);
        res.json({ message: `Email successfully sent to ${to}` });
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
});

// --- DECRYPTION HELPER ENDPOINT (ADMIN ONLY) ---
// This endpoint allows admins to decrypt individual encrypted values
// Usage: POST /api/admin/decrypt with body: { "encryptedData": "iv:authTag:encrypted" }
app.post('/api/admin/decrypt', authenticateToken, async (req, res) => {
    console.log('POST /api/admin/decrypt');
    try {
        const { encryptedData } = req.body;

        if (!encryptedData) {
            return res.status(400).json({ message: 'encryptedData is required' });
        }

        const decrypted = decryptText(encryptedData);
        res.json({ encrypted: encryptedData, decrypted });
    } catch (err) {
        console.error('Error in POST /api/admin/decrypt:', err.message);
        res.status(500).json({ message: 'Decryption failed', error: err.message });
    }
});

// --- SERVER START ---
const startServer = async () => {
    await connectToDatabase();
    
    // This is for local development. For Vercel, the export is what matters.
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
        app.listen(PORT, () => {
            console.log(`🚀 Server running locally on port ${PORT}`);
        });
    }
};

startServer();

console.log('--- SERVER.JS EXECUTION END ---');
// Export for Vercel serverless functions
export default app;

