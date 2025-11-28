import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- CONFIGURATION CHECKS ---
const { 
    MONGO_URI, 
    EMAIL_USER, 
    EMAIL_CLIENT_ID, 
    EMAIL_CLIENT_SECRET, 
    EMAIL_REFRESH_TOKEN 
} = process.env;

if (!MONGO_URI) {
    console.error("CRITICAL ERROR: MONGO_URI is missing in .env file.");
}

// --- MONGODB CONNECTION ---
// Improved connection handling for serverless environments
let cached = global.mongo;

if (!cached) {
    cached = global.mongo = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(MONGO_URI, opts)
            .then(mongoose => {
                console.log('✅ Connected to MongoDB Atlas');
                return mongoose;
            })
            .catch(err => {
                console.error('❌ MongoDB Connection Error:', err);
                cached.promise = null;
                throw err;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

// Connect to database
connectToDatabase().catch(err => {
    console.error('Failed to initialize database connection:', err);
});

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

// --- API ROUTES ---

// 1. Get all students
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1 });
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch students", error: err.message });
    }
});

// 2. Add a student
app.post('/api/students', async (req, res) => {
    try {
        const exists = await Student.findOne({ id: req.body.id });
        if (exists) {
            return res.status(400).json({ message: "Student ID already exists" });
        }
        const newStudent = new Student(req.body);
        const savedStudent = await newStudent.save();
        res.status(201).json(savedStudent);
    } catch (err) {
        res.status(400).json({ message: "Failed to add student", error: err.message });
    }
});

// 3. Update a student
app.put('/api/students/:id', async (req, res) => {
    try {
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
        res.status(500).json({ message: "Failed to update student", error: err.message });
    }
});

// 4. Delete a student
app.delete('/api/students/:id', async (req, res) => {
    try {
        const result = await Student.findOneAndDelete({ id: req.params.id });
        if (!result) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete student", error: err.message });
    }
});

// 5. Get activities
app.get('/api/activities', async (req, res) => {
    try {
        const activities = await Activity.find().sort({ createdAt: -1 }).limit(1000);
        res.json(activities);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch activities", error: err.message });
    }
});

// 6. Log activity
app.post('/api/activities', async (req, res) => {
    try {
        const newActivity = new Activity(req.body);
        const savedActivity = await newActivity.save();
        res.status(201).json(savedActivity);
    } catch (err) {
        res.status(400).json({ message: "Failed to log activity", error: err.message });
    }
});

// --- EMAIL SERVICE (OAuth2) ---

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: EMAIL_USER,
        clientId: EMAIL_CLIENT_ID,
        clientSecret: EMAIL_CLIENT_SECRET,
        refreshToken: EMAIL_REFRESH_TOKEN,
    },
});

app.post('/api/send-email', async (req, res) => {
    const { to, subject, htmlBody } = req.body;

    if (!to || !subject || !htmlBody) {
        return res.status(400).json({ message: 'Missing required email fields: to, subject, or htmlBody' });
    }
    
    if (!EMAIL_USER || !EMAIL_CLIENT_ID || !EMAIL_CLIENT_SECRET || !EMAIL_REFRESH_TOKEN) {
        console.error("Email service is not configured. Please check .env variables.");
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
        console.error(`❌ Failed to send email to ${to}:`, error);
        res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
});

// --- SERVER START ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
