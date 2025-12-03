console.log('--- SERVER.JS EXECUTION START ---');
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import 'dotenv/config';

console.log('--- IMPORTS LOADED ---');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

console.log('--- MIDDLEWARE INITIALIZED ---');

// --- CONFIGURATION CHECKS ---
const { 
    MONGO_URI, 
    EMAIL_USER, 
    EMAIL_CLIENT_ID, 
    EMAIL_CLIENT_SECRET, 
    EMAIL_REFRESH_TOKEN 
} = process.env;

console.log(`--- ENV VARS LOADED ---`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`MONGO_URI is present: ${!!MONGO_URI}`);
console.log(`EMAIL_USER is present: ${!!EMAIL_USER}`);


if (!MONGO_URI) {
    console.error("CRITICAL ERROR: MONGO_URI is missing. The application cannot start without it.");
    // In a serverless environment, throwing an error might be better to halt execution decisively.
    throw new Error("CRITICAL: MONGO_URI environment variable not found.");
}

// --- MONGODB CONNECTION ---
console.log('--- DATABASE CONNECTION LOGIC START ---');
let cached = global.mongo;

if (!cached) {
    cached = global.mongo = { conn: null, promise: null };
    console.log('Initialized global mongoose cache.');
}

async function connectToDatabase() {
    console.log('connectToDatabase called.');
    if (cached.conn) {
        console.log('Using cached database connection.');
        return cached.conn;
    }

    if (!cached.promise) {
        console.log('No existing promise, creating new connection promise.');
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(MONGO_URI, opts)
            .then(mongoose => {
                console.log('✅✅✅ MongoDB Connection Successful (via promise)');
                return mongoose;
            })
            .catch(err => {
                console.error('❌❌❌ MongoDB Connection Error (in promise catch):', err.message);
                console.error('Full error object:', JSON.stringify(err, null, 2));
                cached.promise = null; // Reset promise on error
                throw err;
            });
    } else {
        console.log('Waiting for existing connection promise to resolve.');
    }

    try {
        cached.conn = await cached.promise;
        console.log('Database connection promise resolved.');
    } catch (err) {
        console.error('❌❌❌ Failed to await connection promise:', err.message);
        throw err; // Re-throw to be caught by the caller
    }
    
    return cached.conn;
}

// Initial connection attempt
console.log('--- ATTEMPTING INITIAL DATABASE CONNECTION ---');
connectToDatabase().catch(err => {
    // This will catch errors from the initial connection attempt
    console.error('--- FAILED TO INITIALIZE DATABASE CONNECTION (in top-level catch) ---');
    console.error('Error message:', err.message);
});
console.log('--- DATABASE CONNECTION LOGIC REGISTERED ---');


// --- SCHEMAS ---
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
    remindersSent: [String],
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
const Activity = mongoose.model('Activity', activitySchema);
console.log('--- SCHEMAS AND MODELS CREATED ---');

// --- API ROUTES ---

// 1. Get all students
app.get('/api/students', async (req, res) => {
    console.log('GET /api/students');
    try {
        await connectToDatabase();
        const students = await Student.find().sort({ createdAt: -1 });
        res.json(students);
    } catch (err) {
        console.error('Error in GET /api/students:', err.message);
        res.status(500).json({ message: "Failed to fetch students", error: err.message });
    }
});

// 2. Add a student
app.post('/api/students', async (req, res) => {
    console.log('POST /api/students');
    try {
        await connectToDatabase();
        const exists = await Student.findOne({ id: req.body.id });
        if (exists) {
            return res.status(400).json({ message: "Student ID already exists" });
        }
        const newStudent = new Student(req.body);
        const savedStudent = await newStudent.save();
        res.status(201).json(savedStudent);
    } catch (err) {
        console.error('Error in POST /api/students:', err.message);
        res.status(400).json({ message: "Failed to add student", error: err.message });
    }
});

// 3. Update a student
app.put('/api/students/:id', async (req, res) => {
    console.log(`PUT /api/students/${req.params.id}`);
    try {
        await connectToDatabase();
        const updatedStudent = await Student.findOneAndUpdate(
            { id: req.params.id }, 
            req.body, 
            { new: true }
        );
        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(updatedStudent);
    } catch (err) {
        console.error(`Error in PUT /api/students/${req.params.id}:`, err.message);
        res.status(500).json({ message: "Failed to update student", error: err.message });
    }
});

// 4. Delete a student
app.delete('/api/students/:id', async (req, res) => {
    console.log(`DELETE /api/students/${req.params.id}`);
    try {
        await connectToDatabase();
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
app.get('/api/activities', async (req, res) => {
    console.log('GET /api/activities');
    try {
        await connectToDatabase();
        const activities = await Activity.find().sort({ createdAt: -1 }).limit(1000);
        res.json(activities);
    } catch (err) {
        console.error('Error in GET /api/activities:', err.message);
        res.status(500).json({ message: "Failed to fetch activities", error: err.message });
    }
});

// 6. Log activity
app.post('/api/activities', async (req, res) => {
    console.log('POST /api/activities');
    try {
        await connectToDatabase();
        const newActivity = new Activity(req.body);
        const savedActivity = await newActivity.save();
        res.status(201).json(savedActivity);
    } catch (err) {
        console.error('Error in POST /api/activities:', err.message);
        res.status(400).json({ message: "Failed to log activity", error: err.message });
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


app.post('/api/send-email', async (req, res) => {
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

// --- SERVER START (for local development) ---
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running locally on port ${PORT}`);
    });
} else {
    console.log('--- PRODUCTION MODE: SKIPPING app.listen() ---');
}

console.log('--- SERVER.JS EXECUTION END ---');
// Export for Vercel serverless functions
export default app;

