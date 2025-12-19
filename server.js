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
const Activity = mongoose.model('Activity', activitySchema);
console.log('--- SCHEMAS AND MODELS CREATED ---');

// --- API ROUTES ---

// 1. Get all students
app.get('/api/students', async (req, res) => {
    console.log('GET /api/students');
    try {
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

        // --- START OF CHANGE: Update reminder dates for processed students ---
        if (sentCount > 0) {
            try {
                const remindedStudentIds = studentsToRemind.map(s => s._id); 
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                const nextReminderDate = nextWeek.toISOString().split('T')[0];

                console.log(`CRON: Updating reminderDate for ${remindedStudentIds.length} students to ${nextReminderDate}.`);
                
                const updateResult = await Student.updateMany(
                    { _id: { $in: remindedStudentIds } },
                    { $set: { reminderDate: nextReminderDate } }
                );

                console.log(`CRON: Database update result: ${updateResult.matchedCount} matched, ${updateResult.modifiedCount} modified.`);
                await logActivity('CRON_JOB_UPDATE', `Updated reminderDate for ${updateResult.modifiedCount} students.`);
            } catch (updateError) {
                console.error('CRON: Failed to update student reminder dates:', updateError.message);
                await logActivity('CRON_JOB_FAILED', `Failed to update reminder dates: ${updateError.message}`);
                // Note: The job will still report success for the email sending part,
                // but this log indicates a failure in the state update.
            }
        }
        // --- END OF CHANGE ---
        
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

