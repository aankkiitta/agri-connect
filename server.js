require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');

// --- Configuration ---
const saltRounds = 10;
const ADMIN_USER_ID = 99999;
const ADMIN_EMAIL = 'admin@agriconnect.com';
const ADMIN_PASSWORD_HASH = '$2b$10$77o11F2iW/jG1G5zE8z2w.z5/7qA9r3k5y6L/L1H.Q/1A.T/9f0k';

// --- PRODUCTION URL HELPER ---
function getPublicUrl(req, filePath) {
    if (!filePath) return null;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
    }
    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const baseUrl = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/${cleanPath}`;
}

// --- DATABASE SETUP ---
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10
});

const db = pool;

// --- MULTER STORAGE CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = path.join(__dirname, 'public/uploads');
        if (file.fieldname === 'image' || file.fieldname === 'audio') {
            dir = path.join(__dirname, 'public/uploads/chat');
        } else if (file.fieldname === 'profileImage') {
            dir = path.join(__dirname, 'public/uploads/profiles');
        } else {
            dir = path.join(__dirname, 'public/uploads');
        }
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- CORS CONFIGURATION ---
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'https://agri-connect-2kik.onrender.com'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            console.log('CORS blocked for origin:', origin);
            callback(null, true);
        }
    },
    credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- DATABASE INITIALIZATION ---
async function initializeDatabase() {
    try {
        const connection = await db.getConnection();
        console.log('✅ Successfully connected to MySQL database.');
        console.log(`📊 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        connection.release();

        // Create all necessary tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                contact_number VARCHAR(20),
                years_experience INT DEFAULT 0,
                profile_picture_url VARCHAR(255) DEFAULT '/uploads/default.png',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS success_stories (
                id BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
                user_id INT,
                author_name VARCHAR(255) NOT NULL,
                story_text TEXT NOT NULL,
                location VARCHAR(255),
                submission_date DATE DEFAULT (CURRENT_DATE()),
                status VARCHAR(50) DEFAULT 'pending'
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS farmer_directory (
                id BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
                user_id INT,
                farm_name VARCHAR(255) NOT NULL,
                crop_specialization VARCHAR(255) NOT NULL,
                farm_location VARCHAR(255) NOT NULL,
                contact_email VARCHAR(255),
                submission_date DATE DEFAULT (CURRENT_DATE()),
                status VARCHAR(50) DEFAULT 'pending'
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS equipment (
                id INT AUTO_INCREMENT PRIMARY KEY,
                seller_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                price DECIMAL(10, 2),
                description TEXT,
                image_url VARCHAR(255),
                condition_status VARCHAR(50)
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS schemes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                eligibility TEXT,
                link VARCHAR(255),
                state VARCHAR(100),
                category VARCHAR(100),
                documents TEXT,
                roadmap TEXT,
                help_link VARCHAR(255)
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS user_schemes (
                user_id INT NOT NULL,
                scheme_id INT NOT NULL,
                PRIMARY KEY (user_id, scheme_id)
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                parent_id INT NULL,
                page_identifier VARCHAR(255) NOT NULL,
                text TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                rating INT NOT NULL,
                text TEXT NOT NULL,
                page_name VARCHAR(255) DEFAULT 'home',
                username VARCHAR(255) DEFAULT 'Anonymous',
                user_photo VARCHAR(255) DEFAULT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS hub_listings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                author_name VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                exchange_type VARCHAR(50) DEFAULT 'normal',
                target_size INT DEFAULT 1,
                location VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                contact_number VARCHAR(20),
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS hub_group_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                listing_id INT NOT NULL,
                user_id INT NOT NULL,
                user_name VARCHAR(255),
                user_contact VARCHAR(20),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_member (listing_id, user_id)
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                content TEXT,
                image_url VARCHAR(255),
                published_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS user_crop_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                crop_name VARCHAR(255) NOT NULL,
                sowing_date DATE,
                harvest_date DATE,
                current_stage VARCHAR(100),
                progress_percent INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ All database tables verified/created successfully.');
    } catch (err) {
        console.error('❌ FATAL ERROR during database initialization:');
        console.error(`   Message: ${err.message}`);
        console.error(`   Code: ${err.code || 'N/A'}`);
        console.error(`   Errno: ${err.errno || 'N/A'}`);
        console.error(`   Host: ${process.env.DB_HOST}`);
        console.error(`   Database: ${process.env.DB_NAME}`);
        process.exit(1);
    }
}

initializeDatabase();

// ==================================================
// CHAT STATE - GROUP CHAT (ONLY ONE)
// ==================================================
const chatUsers = new Map(); // socketId -> user data
const messageCache = []; // Array for messages

// ==================================================
// CHAT ROUTE
// ==================================================
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// ==================================================
// CHAT SOCKET EVENTS - CLEAN WORKING VERSION
// ==================================================
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
    console.log('👤 New client connected:', socket.id);
    
    let currentUser = null;

    // USER JOINS GROUP CHAT
    socket.on('user-connected', (data) => {
        console.log('📝 User data received:', data);
        
        const userId = data.userId || data.id || null;
        const email = data.email || null;
        const name = data.name || 'User';
        
        if (!userId && !email) {
            console.error('❌ No user identifier provided');
            return;
        }
        
        currentUser = {
            id: userId,
            email: email,
            name: name,
            socketId: socket.id
        };
        
        chatUsers.set(socket.id, currentUser);
        
        console.log(`✅ User joined group chat: ${name} (${email || userId})`);
        
        // Send online users list to everyone
        const onlineUsers = Array.from(chatUsers.values()).map(u => ({
            id: u.id,
            email: u.email,
            name: u.name
        }));
        io.emit('online-users', onlineUsers);
        
        // Send chat history
        if (messageCache.length > 0) {
            const recentMessages = messageCache.slice(-50);
            console.log(`📨 Sending ${recentMessages.length} cached messages to ${name}`);
            socket.emit('chat-history', recentMessages);
        } else {
            socket.emit('chat-history', []);
        }
        
        // Broadcast user joined message
        io.emit('user-joined', {
            name: name,
            message: `${name} joined the chat`
        });
    });

    // SEND MESSAGE TO GROUP
    socket.on('send-message', (data) => {
        try {
            const user = chatUsers.get(socket.id);
            if (!user) {
                console.error('❌ User not found for socket:', socket.id);
                return;
            }
            
            console.log(`📨 Message from ${user.name} (${user.email}): "${data.message}"`);
            
            const messageData = {
                id: Date.now(),
                userId: user.id,
                email: user.email,
                name: user.name,
                message: data.message,
                message_type: data.message_type || 'text',
                timestamp: new Date().toISOString()
            };
            
            messageCache.push(messageData);
            if (messageCache.length > 100) {
                messageCache.shift();
            }
            
            // ✅ Broadcast to ALL users
            io.emit('receive-message', messageData);
            console.log(`📨 Broadcasted to ${chatUsers.size} users`);
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            socket.emit('message-error', { error: 'Failed to send message' });
        }
    });

    // IMAGE UPLOAD
    socket.on('send-image', (data) => {
        const user = chatUsers.get(socket.id);
        if (!user) return;
        
        const messageData = {
            id: Date.now(),
            userId: user.id,
            email: user.email,
            name: user.name,
            message: data.filePath,
            message_type: 'image',
            timestamp: new Date().toISOString()
        };
        
        messageCache.push(messageData);
        if (messageCache.length > 100) {
            messageCache.shift();
        }
        
        io.emit('receive-message', messageData);
    });

    // AUDIO UPLOAD
    socket.on('send-audio', (data) => {
        const user = chatUsers.get(socket.id);
        if (!user) return;
        
        const messageData = {
            id: Date.now(),
            userId: user.id,
            email: user.email,
            name: user.name,
            message: data.filePath,
            message_type: 'audio',
            timestamp: new Date().toISOString()
        };
        
        messageCache.push(messageData);
        if (messageCache.length > 100) {
            messageCache.shift();
        }
        
        io.emit('receive-message', messageData);
    });

    // TYPING INDICATOR
    socket.on('typing', () => {
        const user = chatUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('user-typing', {
                name: user.name,
                isTyping: true
            });
        }
    });

    socket.on('stop-typing', () => {
        const user = chatUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('user-typing', {
                name: user.name,
                isTyping: false
            });
        }
    });

    // DISCONNECT
    socket.on('disconnect', () => {
        console.log('👋 Client disconnected:', socket.id);
        
        const user = chatUsers.get(socket.id);
        if (user) {
            chatUsers.delete(socket.id);
            
            const onlineUsers = Array.from(chatUsers.values()).map(u => ({
                id: u.id,
                email: u.email,
                name: u.name
            }));
            io.emit('online-users', onlineUsers);
            
            io.emit('user-left', {
                name: user.name,
                message: `${user.name} left the chat`
            });
        }
    });
});

// --- HEALTH ENDPOINT ---
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Agri Connect API is running',
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString()
    });
});

// --- DEBUG ENDPOINT ---
app.get('/api/debug/public-data', async (req, res) => {
    try {
        const [farmers] = await db.query('SELECT COUNT(*) as count FROM farmer_directory');
        const [approvedFarmers] = await db.query('SELECT COUNT(*) as count FROM farmer_directory WHERE status = "approved"');
        const [stories] = await db.query('SELECT COUNT(*) as count FROM success_stories');
        const [approvedStories] = await db.query('SELECT COUNT(*) as count FROM success_stories WHERE status = "approved"');
        const [reviews] = await db.query('SELECT COUNT(*) as count FROM reviews');

        res.json({
            farmers: farmers[0].count,
            approvedFarmers: approvedFarmers[0].count,
            stories: stories[0].count,
            approvedStories: approvedStories[0].count,
            reviews: reviews[0].count
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// --- ROUTE HANDLER FOR ROOT URL ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'agri2.html'));
});

// ======== AUTHENTICATION ROUTES ========

// /signup
app.post('/signup', async (req, res) => {
    const { name, email, location, contact_number, password, years_experience } = req.body;
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO users (name, email, location, contact_number, password, years_experience) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [name, email, location, contact_number, hash, years_experience || 0]);
        const [rows] = await db.query('SELECT id, name, email, location, contact_number, profile_picture_url, years_experience FROM users WHERE id = ?', [result.insertId]);

        res.status(200).json({ success: true, message: 'Account created successfully!', user: rows[0] });
    } catch (err) {
        const message = err.errno === 1062 ? 'Email address already registered.' : 'Database error during signup.';
        res.status(500).json({ success: false, message: message });
    }
});

// /login (Frontend user login)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const sql = 'SELECT id, name, email, password, location, contact_number, profile_picture_url, years_experience FROM users WHERE email = ?';
        const [results] = await db.query(sql, [email]);

        if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const { password: userPasswordHash, ...userWithoutPassword } = user;
            res.status(200).json({ success: true, message: 'Login successful!', user: userWithoutPassword });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.error('❌ ADMIN_EMAIL or ADMIN_PASSWORD missing');
            return res.status(500).json({
                success: false,
                message: 'Admin credentials are not configured on server.'
            });
        }

        if (
            email.trim().toLowerCase() !== adminEmail.trim().toLowerCase() ||
            password !== adminPassword
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Admin credentials.'
            });
        }

        return res.json({
            success: true,
            user: {
                id: 99999,
                name: 'Agri Admin',
                email: adminEmail
            }
        });

    } catch (error) {
        console.error('❌ Admin login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Admin login failed.'
        });
    }
});

// ======== USER PROFILE ROUTES ========

// Upload Profile Picture
app.post('/api/upload-profile-picture', upload.single('profileImage'), async (req, res) => {
    const userId = req.body.userId;
    if (!req.file || !userId) return res.status(400).json({ success: false, message: 'No file or user ID provided.' });

    const imageUrl = '/uploads/' + req.file.filename;
    try {
        const sql = 'UPDATE users SET profile_picture_url = ? WHERE id = ?';
        await db.query(sql, [imageUrl, userId]);

        const fullImageUrl = getPublicUrl(req, imageUrl);
        res.status(200).json({ success: true, message: 'Profile picture updated!', profile_picture_url: fullImageUrl });
    } catch (err) {
        fs.unlink(req.file.path, (unlinkErr) => { if (unlinkErr) console.error('Error deleting failed upload:', unlinkErr); });
        res.status(500).json({ success: false, message: 'Database update failed.' });
    }
});

// Get User by ID
app.get('/api/user/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, email, contact_number, location, years_experience, profile_picture_url 
             FROM users 
             WHERE id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.json(null);
        }

        if (rows[0].profile_picture_url) {
            rows[0].profile_picture_url = getPublicUrl(req, rows[0].profile_picture_url);
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('USER FETCH ERROR:', err);
        res.status(500).json(null);
    }
});

// ======== FARMER DIRECTORY ROUTES ========

// Submit Farmer Directory Listing
app.post('/api/submit-farmer-listing', async (req, res) => {
    const { userId, farmName, cropSpecialization, farmLocation, contactEmail } = req.body;
    const sql = `INSERT INTO farmer_directory (user_id, farm_name, crop_specialization, farm_location, contact_email, status) VALUES (?, ?, ?, ?, ?, 'pending');`;
    try {
        await db.query(sql, [userId, farmName, cropSpecialization, farmLocation, contactEmail]);
        res.status(200).json({ success: true, message: 'Listing submitted successfully.' });
    } catch (err) {
        console.error('Error submitting farmer listing:', err);
        res.status(500).json({ success: false, message: 'Failed to submit listing.' });
    }
});

// Fetch User's Submitted Farmer Listings
app.get('/api/my-farmer-listings/:userId', async (req, res) => {
    try {
        const sql = `
            SELECT farm_name, crop_specialization, farm_location, status, submission_date 
            FROM farmer_directory 
            WHERE user_id = ? 
            ORDER BY submission_date DESC
        `;
        const [listings] = await db.query(sql, [req.params.userId]);
        res.status(200).json(listings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load user listings.' });
    }
});

// GET Approved Farmers
app.get('/api/approved-farmers', async (req, res) => {
    try {
        const sql = `
            SELECT
                f.id,
                f.user_id,
                f.farm_name,
                f.crop_specialization,
                f.farm_location,
                f.contact_email,
                f.submission_date,
                f.status,
                u.name AS author_name,
                u.email,
                u.contact_number,
                u.location AS user_location,
                u.years_experience,
                u.profile_picture_url
            FROM farmer_directory f
            LEFT JOIN users u ON f.user_id = u.id
            WHERE f.status = 'approved'
            ORDER BY f.submission_date DESC
        `;
        const [farmers] = await db.query(sql);

        const processedFarmers = farmers.map(farmer => {
            if (farmer.profile_picture_url) {
                farmer.profile_picture_url = getPublicUrl(req, farmer.profile_picture_url);
            }
            return farmer;
        });

        console.log(`✅ GET /api/approved-farmers: ${processedFarmers.length} farmers returned`);
        res.status(200).json(processedFarmers);
    } catch (err) {
        console.error('❌ Error fetching approved farmers:', err);
        res.status(500).json({ success: false, message: 'Failed to load farmer directory from database.' });
    }
});

// ======== SUCCESS STORIES ROUTES ========

// Submit Success Story
app.post('/api/submit-story', async (req, res) => {
    const { userId, authorName, storyText, location } = req.body;
    const sql = `INSERT INTO success_stories (user_id, author_name, story_text, location, status) VALUES (?, ?, ?, ?, 'pending');`;
    try {
        await db.query(sql, [userId, authorName, storyText, location]);
        res.status(200).json({ success: true, message: 'Story submitted successfully.' });
    } catch (err) {
        console.error('Error submitting story:', err);
        res.status(500).json({ success: false, message: 'Failed to submit story.' });
    }
});

// GET Approved Success Stories
app.get('/api/success-stories', async (req, res) => {
    try {
        const sql = `
            SELECT
                ss.id,
                ss.user_id,
                ss.author_name,
                ss.story_text,
                ss.location,
                ss.submission_date,
                ss.status,
                u.email,
                u.contact_number,
                u.years_experience,
                u.profile_picture_url
            FROM success_stories ss
            LEFT JOIN users u ON ss.user_id = u.id
            WHERE ss.status = 'approved'
            ORDER BY ss.submission_date DESC
        `;
        const [stories] = await db.query(sql);

        const processedStories = stories.map(story => {
            if (story.profile_picture_url) {
                story.profile_picture_url = getPublicUrl(req, story.profile_picture_url);
            }
            return story;
        });

        console.log(`✅ GET /api/success-stories: ${processedStories.length} stories returned`);
        res.status(200).json(processedStories);
    } catch (err) {
        console.error('❌ Error fetching success stories:', err);
        res.status(500).json({ success: false, message: 'Failed to load success stories.' });
    }
});

// ======== SCHEMES ROUTES ========

// Get All Schemes
app.get('/api/schemes', async (req, res) => {
    try {
        const [schemes] = await db.query(
            'SELECT id, name, description, eligibility, link, state, category, documents, roadmap, help_link FROM schemes'
        );
        res.json(schemes);
    } catch (error) {
        console.error('❌ Database query failed:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// Fetch User's Saved Scheme IDs
app.get('/api/my-schemes/ids/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [savedSchemes] = await db.query(
            'SELECT scheme_id FROM user_schemes WHERE user_id = ?',
            [userId]
        );
        res.json(savedSchemes);
    } catch (error) {
        console.error('Error fetching saved scheme IDs:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve user saved schemes.' });
    }
});

// Fetch User's Saved Scheme Details
app.get('/api/my-schemes/details/:userId', async (req, res) => {
    try {
        const sql = `SELECT s.name, s.description, s.link FROM schemes s JOIN user_schemes us ON s.id = us.scheme_id WHERE us.user_id = ?;`;
        const [schemes] = await db.query(sql, [req.params.userId]);
        res.status(200).json(schemes);
    } catch (err) {
        console.error('Error fetching user schemes:', err);
        res.status(500).json({ success: false, message: 'Failed to load user schemes.' });
    }
});

// Save a Scheme
app.post('/api/save-scheme', async (req, res) => {
    const { userId, schemeId } = req.body;
    try {
        const [existing] = await db.query(
            'SELECT * FROM user_schemes WHERE user_id = ? AND scheme_id = ?',
            [userId, schemeId]
        );

        if (existing.length === 0) {
            await db.query(
                'INSERT INTO user_schemes (user_id, scheme_id) VALUES (?, ?)',
                [userId, schemeId]
            );
        }
        res.json({ success: true, message: 'Scheme state updated.' });
    } catch (error) {
        console.error('Error saving scheme:', error);
        res.status(500).json({ success: false, message: 'Database error during save operation.' });
    }
});

// Unsave a Scheme
app.post('/api/unsave-scheme', async (req, res) => {
    const { userId, schemeId } = req.body;
    try {
        await db.query(
            'DELETE FROM user_schemes WHERE user_id = ? AND scheme_id = ?',
            [userId, schemeId]
        );
        res.json({ success: true, message: 'Scheme unsaved successfully.' });
    } catch (error) {
        console.error('Error unsaving scheme:', error);
        res.status(500).json({ success: false, message: 'Database error during unsave operation.' });
    }
});

// ======== EQUIPMENT ROUTES ========

// Add Equipment for Sale
app.post('/api/equipment/add', upload.single('image'), async (req, res) => {
    const { userId, name, category, condition, price, description } = req.body;

    if (!userId || !name || !price) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const imageUrl = req.file ? '/uploads/' + req.file.filename : '/uploads/default-equipment.png';

    try {
        const sql = `
            INSERT INTO equipment 
            (seller_id, name, category, condition_status, price, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [userId, name, category, condition, price, description, imageUrl]);

        res.json({ success: true, message: 'Equipment listed successfully!' });
    } catch (error) {
        console.error("Database Insert Error:", error);
        if (req.file) {
            fs.unlink(req.file.path, (err) => { if (err) console.error("File cleanup error:", err); });
        }
        res.status(500).json({ success: false, message: 'Database error occurred.' });
    }
});

// Get All Equipment for Marketplace
app.get('/api/equipment/all', async (req, res) => {
    try {
        const sql = `
            SELECT e.*, u.name AS seller_name, u.contact_number, u.email AS seller_email
            FROM equipment e
            JOIN users u ON e.seller_id = u.id
            ORDER BY e.id DESC;
        `;
        const [equipment] = await db.query(sql);

        const processedEquipment = equipment.map(item => {
            if (item.image_url) {
                item.image_url = getPublicUrl(req, item.image_url);
            }
            return item;
        });

        res.status(200).json(processedEquipment);
    } catch (err) {
        console.error('Error fetching all equipment:', err);
        res.status(500).json({ success: false, message: 'Failed to load marketplace equipment.' });
    }
});

// Fetch User's Equipment Listings
app.get('/api/my-equipment/:userId', async (req, res) => {
    try {
        const [equipment] = await db.query('SELECT * FROM equipment WHERE seller_id = ? ORDER BY id DESC', [req.params.userId]);

        const processedEquipment = equipment.map(item => {
            if (item.image_url) {
                item.image_url = getPublicUrl(req, item.image_url);
            }
            return item;
        });

        res.status(200).json(processedEquipment);
    } catch (err) {
        console.error('Error fetching user equipment:', err);
        res.status(500).json({ success: false, message: 'Failed to load user equipment listings.' });
    }
});

// Delete Equipment (User Side)
app.delete('/api/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const [check] = await db.query('SELECT * FROM equipment WHERE id = ? AND seller_id = ?', [id, userId]);
        if (check.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized or Item not found.' });
        }

        const imageUrl = check[0].image_url;
        if (imageUrl && !imageUrl.includes('default')) {
            const filePath = path.join(__dirname, 'public', imageUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await db.query('DELETE FROM equipment WHERE id = ?', [id]);
        res.json({ success: true, message: 'Listing deleted successfully.' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: 'Server error during deletion.' });
    }
});

// Edit Equipment (User Side)
app.put('/api/equipment/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { userId, name, category, condition, price, description } = req.body;

    try {
        const [check] = await db.query('SELECT * FROM equipment WHERE id = ? AND seller_id = ?', [id, userId]);
        if (check.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized or Item not found.' });
        }

        let sql, params;
        if (req.file) {
            const imageUrl = '/uploads/' + req.file.filename;
            sql = `UPDATE equipment SET name=?, category=?, condition_status=?, price=?, description=?, image_url=? WHERE id=?`;
            params = [name, category, condition, price, description, imageUrl, id];
        } else {
            sql = `UPDATE equipment SET name=?, category=?, condition_status=?, price=?, description=? WHERE id=?`;
            params = [name, category, condition, price, description, id];
        }

        await db.query(sql, params);
        res.json({ success: true, message: 'Listing updated successfully!' });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: 'Server error during update.' });
    }
});

// ======== REVIEWS ROUTES ========

// POST Review
app.post('/api/reviews/add', upload.single('photo'), async (req, res) => {
    try {
        const { rating, review_text, username, page_name, userId } = req.body;

        if (!rating || !review_text) {
            return res.status(400).json({ success: false, message: 'Rating and review text are required.' });
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID required' });
        }

        const photoPath = req.file ? 'uploads/' + req.file.filename : null;
        const finalPageName = page_name || 'home';
        const finalUsername = username || 'Anonymous';

        await db.query(
            `INSERT INTO reviews (user_id, rating, text, page_name, username, user_photo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, rating, review_text, finalPageName, finalUsername, photoPath]
        );

        console.log(`✅ POST /api/reviews/add: Review added for page "${finalPageName}" by user ${userId}`);
        res.json({ success: true, message: 'Review submitted successfully.' });

    } catch (err) {
        console.error("❌ REVIEW ERROR:", err);
        res.status(500).json({ success: false, message: 'Server error while submitting review.' });
    }
});

// GET Reviews List
app.get('/api/reviews/list', async (req, res) => {
    try {
        const page_name = req.query.page_name || 'home';
        const page_no = parseInt(req.query.page_no) || 1;
        const limit = 3;
        const offset = (page_no - 1) * limit;

        const [rows] = await db.query(
            `SELECT 
                r.id, 
                r.rating, 
                r.text, 
                r.username, 
                r.page_name,
                r.user_photo,
                r.timestamp,
                u.id AS user_id,
                u.name AS authorName, 
                u.email, 
                u.contact_number, 
                u.profile_picture_url, 
                u.years_experience, 
                u.location
             FROM reviews r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.page_name = ? 
             ORDER BY r.id DESC 
             LIMIT ? OFFSET ?`,
            [page_name, limit, offset]
        );

        const processedRows = rows.map(row => {
            if (row.profile_picture_url) {
                row.profile_picture_url = getPublicUrl(req, row.profile_picture_url);
            }
            if (row.user_photo) {
                row.user_photo = getPublicUrl(req, row.user_photo);
            }
            return row;
        });

        console.log(`✅ GET /api/reviews/list: ${processedRows.length} reviews returned for page "${page_name}"`);
        res.json(processedRows);

    } catch (err) {
        console.error("❌ REVIEW LIST ERROR:", err);
        res.status(500).json([]);
    }
});

// GET Reviews Average
app.get('/api/reviews/average', async (req, res) => {
    try {
        const { page_name } = req.query;

        const [rows] = await db.query(
            `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total
             FROM reviews
             WHERE page_name = ?`,
            [page_name || 'home']
        );

        res.json({
            avg_rating: parseFloat(rows[0]?.avg_rating || 0),
            total: parseInt(rows[0]?.total || 0)
        });

    } catch (err) {
        console.error("❌ AVG ERROR:", err);
        res.status(500).json({ avg_rating: 0, total: 0 });
    }
});

// GET Reviews (Alternative endpoint)
app.get('/api/reviews', async (req, res) => {
    try {
        const sql = `
            SELECT 
                r.*, 
                u.name AS authorName, 
                u.email, 
                u.contact_number, 
                u.profile_picture_url, 
                u.years_experience, 
                u.location
            FROM reviews r
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.timestamp DESC`;
        const [reviews] = await db.query(sql);

        const processedReviews = reviews.map(review => {
            if (review.profile_picture_url) {
                review.profile_picture_url = getPublicUrl(req, review.profile_picture_url);
            }
            if (review.user_photo) {
                review.user_photo = getPublicUrl(req, review.user_photo);
            }
            return review;
        });

        res.json(processedReviews);
    } catch (err) {
        console.error('Error fetching reviews:', err);
        res.status(500).json({ success: false, message: 'Failed to load reviews.' });
    }
});

// Delete Review
app.delete('/api/reviews/:reviewId/:userId', async (req, res) => {
    const { reviewId, userId } = req.params;

    try {
        const [review] = await db.query('SELECT user_id FROM reviews WHERE id = ?', [reviewId]);

        if (review.length === 0) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        if (parseInt(userId) !== review[0].user_id && parseInt(userId) !== ADMIN_USER_ID) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        res.json({ success: true, message: 'Deleted successfully.' });
    } catch (err) {
        console.error('Error deleting review:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ======== COMMENTS ROUTES ========

// Fetch Comments and Replies
app.get('/api/comments/:pageIdentifier', async (req, res) => {
    const { pageIdentifier } = req.params;
    try {
        const sql = `
            SELECT
                c.id, c.parent_id, c.text, c.timestamp, c.user_id,
                u.name AS authorName, u.email, u.contact_number,
                u.profile_picture_url, u.years_experience, u.location
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.page_identifier = ?
            ORDER BY c.timestamp ASC;
        `;
        const [comments] = await db.query(sql, [pageIdentifier]);

        const processedComments = comments.map(comment => {
            if (comment.profile_picture_url) {
                comment.profile_picture_url = getPublicUrl(req, comment.profile_picture_url);
            }
            return comment;
        });

        res.status(200).json(processedComments);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ success: false, message: 'Failed to load comments from the server.' });
    }
});

// Post a new comment or reply
app.post('/api/comments', async (req, res) => {
    const { userId, parentId, pageIdentifier, text } = req.body;
    const finalParentId = (parentId === null || parentId === 0) ? null : parentId;

    try {
        const sql = `
            INSERT INTO comments (user_id, parent_id, page_identifier, text)
            VALUES (?, ?, ?, ?);
        `;
        await db.query(sql, [userId, finalParentId, pageIdentifier, text]);
        res.status(200).json({ success: true, message: 'Comment posted successfully.' });
    } catch (err) {
        console.error('Error posting comment:', err);
        res.status(500).json({ success: false, message: 'Failed to post comment due to server error.' });
    }
});

// Delete a comment
app.delete('/api/comments/:commentId/:userId', async (req, res) => {
    const { commentId, userId } = req.params;

    try {
        const [commentCheck] = await db.query('SELECT user_id FROM comments WHERE id = ?', [commentId]);

        if (commentCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        const commentOwnerId = commentCheck[0].user_id;

        if (parseInt(userId) !== commentOwnerId && parseInt(userId) !== ADMIN_USER_ID) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this comment.' });
        }

        await db.query('DELETE FROM comments WHERE id = ? OR parent_id = ?', [commentId, commentId]);
        res.status(200).json({ success: true, message: 'Comment deleted successfully.' });
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ success: false, message: 'Failed to delete comment.' });
    }
});

// ======== CHAT/IMAGE/AUDIO UPLOAD ROUTES ========

// Handles Image Uploads for Chat
app.post('/upload/image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }
    const filePath = getPublicUrl(req, `/uploads/chat/${req.file.filename}`);
    res.send({ filePath: filePath });
});

// Handles Audio Uploads for Chat
app.post('/upload/audio', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }
    const filePath = getPublicUrl(req, `/uploads/chat/${req.file.filename}`);
    res.send({ filePath: filePath });
});

// ======== NEWS API ROUTE ========

app.get('/news', async (req, res) => {
    try {
        const query = req.query.q || 'agriculture';
        const page = req.query.page || 1;
        const pageSize = req.query.pageSize || 12;
        const sortBy = req.query.sortBy || 'publishedAt';

        const NEWS_API_KEY = process.env.NEWS_API_KEY;
        if (!NEWS_API_KEY) {
            console.error('❌ NEWS_API_KEY environment variable is not set');
            return res.status(500).json({ error: 'News API key is not configured.' });
        }

        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: query,
                page: page,
                pageSize: pageSize,
                sortBy: sortBy,
                apiKey: NEWS_API_KEY,
                language: 'en'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('News API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch news.' });
    }
});

// ======== MANDI API PROXY ========

const API_KEY = process.env.DATA_GOV_IN_API_KEY;

app.get("/api/mandi", async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;

        if (!API_KEY) {
            console.error('❌ DATA_GOV_IN_API_KEY environment variable is not set');
            return res.status(500).json({ error: 'API key is not configured.' });
        }

        const response = await axios.get(
            "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
            {
                params: {
                    "api-key": API_KEY,
                    format: "json",
                    limit,
                    offset
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Mandi API Error:', error.message);
        res.status(500).json({ error: 'API error' });
    }
});

// ======== CROP PLANS ROUTES ========

// Save OR Update a Crop Plan
app.post('/api/save-crop-plan', async (req, res) => {
    const { planId, userId, cropName, sowingDate, harvestDate, currentStage, progress } = req.body;

    if (!userId || !cropName || !sowingDate) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        if (planId) {
            const sql = `UPDATE user_crop_plans SET sowing_date=?, harvest_date=?, current_stage=?, progress_percent=? WHERE id=? AND user_id=?`;
            await db.query(sql, [sowingDate, harvestDate, currentStage, progress, planId, userId]);
            res.json({ success: true, message: 'Plan updated successfully!' });
        } else {
            const sql = `INSERT INTO user_crop_plans (user_id, crop_name, sowing_date, harvest_date, current_stage, progress_percent) VALUES (?, ?, ?, ?, ?, ?)`;
            await db.query(sql, [userId, cropName, sowingDate, harvestDate, currentStage, progress]);
            res.json({ success: true, message: 'New plan created!' });
        }
    } catch (error) {
        console.error('Error saving plan:', error);
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// Fetch User's Active Plans
app.get('/api/my-crop-plans/:userId', async (req, res) => {
    try {
        const [plans] = await db.query('SELECT * FROM user_crop_plans WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId]);
        res.json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ success: false, message: 'Failed to load plans.' });
    }
});

// Delete a Plan
app.delete('/api/crop-plan/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM user_crop_plans WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Plan deleted.' });
    } catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ success: false, message: 'Deletion failed.' });
    }
});

// ======== COMMUNITY HUB ROUTES ========

// Add Hub Listing
app.post('/api/hub-listings', async (req, res) => {
    const { userId, authorName, title, category, exchangeType, targetSize, location, description, contactNumber } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const sql = `INSERT INTO hub_listings 
                (user_id, author_name, title, category, exchange_type, target_size, location, description, contact_number) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        const finalTarget = exchangeType === 'group' ? parseInt(targetSize) || 2 : 1;

        await db.query(sql, [
            userId, authorName, title, category || 'seed',
            exchangeType, finalTarget, location, description, contactNumber
        ]);
        res.json({ success: true, message: "Listing published!" });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

// Fetch All Hub Listings
app.get('/api/hub-listings', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT h.*, COUNT(m.id) as member_count 
            FROM hub_listings h 
            LEFT JOIN hub_group_members m ON h.id = m.listing_id 
            GROUP BY h.id 
            ORDER BY h.created_at DESC`);
        res.json(results);
    } catch (err) {
        console.error('Error fetching hub listings:', err);
        res.status(500).json({ success: false, message: "Error fetching hub" });
    }
});

// Get Group Details
app.get('/api/hub/group-details/:listingId', async (req, res) => {
    try {
        const [members] = await db.query(
            `SELECT user_name, user_contact FROM hub_group_members WHERE listing_id = ?`,
            [req.params.listingId]
        );
        res.json(members);
    } catch (err) {
        console.error('Error fetching group details:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch group details.' });
    }
});

// Join Group
app.post('/api/hub/join-group', async (req, res) => {
    const { listingId, userId, userName, userContact } = req.body;

    if (!userId || !listingId) {
        return res.status(400).json({ success: false, message: "Invalid request data." });
    }

    try {
        const [existing] = await db.query(
            'SELECT * FROM hub_group_members WHERE listing_id = ? AND user_id = ?',
            [listingId, userId]
        );

        if (existing.length > 0) {
            return res.json({ success: false, message: "You have already joined this group!" });
        }

        await db.query(
            `INSERT INTO hub_group_members (listing_id, user_id, user_name, user_contact) VALUES (?, ?, ?, ?)`,
            [listingId, userId, userName, userContact]
        );

        res.json({ success: true, message: "Successfully joined the group!" });
    } catch (err) {
        console.error("Join Group Error:", err);
        res.status(500).json({ success: false, message: "Database error while joining." });
    }
});

// ======== ARTICLES ROUTES ========

// Get All Articles (Public)
app.get('/api/articles', async (req, res) => {
    try {
        try {
            await db.query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS published_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        } catch (columnErr) {}

        const [articles] = await db.query('SELECT * FROM articles ORDER BY published_at DESC');

        const processedArticles = articles.map(article => {
            if (article.image_url) {
                article.image_url = getPublicUrl(req, article.image_url);
            }
            return article;
        });

        res.status(200).json(processedArticles);
    } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Add Article (Admin)
app.post('/api/articles', async (req, res) => {
    const { title, category, content, image_url, date } = req.body;
    try {
        const sql = 'INSERT INTO articles (title, category, content, image_url, published_at) VALUES (?, ?, ?, ?, ?)';
        const publishDate = date ? new Date(date) : new Date();

        await db.query(sql, [title, category, content, image_url, publishDate]);
        res.status(200).json({ success: true, message: 'Article published!' });
    } catch (err) {
        console.error('Error saving article:', err);
        res.status(500).json({ success: false, message: 'Failed to save article.' });
    }
});

// ======== ADMIN ROUTES ========

// Admin Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [[totalUsersResult]] = await db.query('SELECT COUNT(*) AS count FROM users');
        const [[pendingStoriesResult]] = await db.query("SELECT COUNT(*) AS count FROM success_stories WHERE status = 'pending'");
        const [[pendingFarmersResult]] = await db.query("SELECT COUNT(*) AS count FROM farmer_directory WHERE status = 'pending'");
        const [[totalEquipmentResult]] = await db.query('SELECT COUNT(*) AS count FROM equipment');

        res.json({
            totalUsers: totalUsersResult.count,
            pendingApprovals: pendingStoriesResult.count + pendingFarmersResult.count,
            pendingStories: pendingStoriesResult.count,
            pendingFarmers: pendingFarmersResult.count,
            totalEquipment: totalEquipmentResult.count
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ success: false, message: 'Failed to load stats.' });
    }
});

// Admin: Fetch Pending Success Stories
app.get('/api/admin/stories/pending', async (req, res) => {
    try {
        const [stories] = await db.query(`
            SELECT id, user_id, author_name, story_text, location, submission_date
            FROM success_stories
            WHERE status = 'pending'
            ORDER BY submission_date ASC
        `);
        res.json(stories);
    } catch (error) {
        console.error('Error fetching pending stories:', error);
        res.status(500).json({ success: false, message: 'Failed to load pending stories.' });
    }
});

// Admin: Fetch ALL Success Stories
app.get('/api/admin/stories/all', async (req, res) => {
    try {
        const [stories] = await db.query(`
            SELECT id, user_id, author_name, story_text, location, submission_date, status
            FROM success_stories
            ORDER BY submission_date DESC
        `);
        res.json(stories);
    } catch (error) {
        console.error('Error fetching all stories:', error);
        res.status(500).json({ success: false, message: 'Failed to load all stories.' });
    }
});

// Admin: Update Story Status
app.post('/api/admin/story/update-status', async (req, res) => {
    const { id, status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    try {
        await db.query('UPDATE success_stories SET status = ? WHERE id = ?', [status, id]);
        console.log(`✅ Story ${id} status updated to ${status}`);
        res.json({ success: true, message: `Story ${status} successfully.` });
    } catch (error) {
        console.error('Error updating story status:', error);
        res.status(500).json({ success: false, message: 'Failed to update story status.' });
    }
});

// Admin: Delete Success Story
app.delete('/api/admin/story/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM success_stories WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Story not found.' });
        }
        res.json({ success: true, message: `Success Story ID ${id} deleted successfully.` });
    } catch (error) {
        console.error('Error deleting story:', error);
        res.status(500).json({ success: false, message: 'Failed to delete story.' });
    }
});

// Admin: Fetch Pending Farmer Directory Listings
app.get('/api/admin/farmers/pending', async (req, res) => {
    try {
        const [farmers] = await db.query(`
            SELECT id, user_id, farm_name, crop_specialization, farm_location, contact_email, submission_date
            FROM farmer_directory
            WHERE status = 'pending'
            ORDER BY submission_date ASC
        `);
        res.json(farmers);
    } catch (error) {
        console.error('Error fetching pending farmers:', error);
        res.status(500).json({ success: false, message: 'Failed to load pending farmers.' });
    }
});

// Admin: Fetch ALL Farmer Directory Listings
app.get('/api/admin/farmers/all', async (req, res) => {
    try {
        const [farmers] = await db.query(`
            SELECT id, user_id, farm_name, crop_specialization, farm_location, contact_email, submission_date, status
            FROM farmer_directory
            ORDER BY submission_date DESC
        `);
        res.json(farmers);
    } catch (error) {
        console.error('Error fetching all farmers:', error);
        res.status(500).json({ success: false, message: 'Failed to load all farmers.' });
    }
});

// Admin: Update Farmer Status
app.post('/api/admin/farmer/update-status', async (req, res) => {
    const { id, status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    try {
        await db.query('UPDATE farmer_directory SET status = ? WHERE id = ?', [status, id]);
        console.log(`✅ Farmer listing ${id} status updated to ${status}`);
        res.json({ success: true, message: `Farmer listing ${status} successfully.` });
    } catch (error) {
        console.error('Error updating farmer status:', error);
        res.status(500).json({ success: false, message: 'Failed to update farmer status.' });
    }
});

// Admin: Delete Farmer Directory Listing
app.delete('/api/admin/farmer/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM farmer_directory WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Farmer listing not found.' });
        }
        res.json({ success: true, message: `Farmer Listing ID ${id} deleted successfully.` });
    } catch (error) {
        console.error('Error deleting farmer listing:', error);
        res.status(500).json({ success: false, message: 'Failed to delete farmer listing.' });
    }
});

// Admin: Fetch All Users
app.get('/api/admin/users', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT id, name, email, location, contact_number, years_experience, created_at
            FROM users
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error('Error fetching user list:', error);
        res.status(500).json({ success: false, message: 'Failed to load user list.' });
    }
});

// Admin: Fetch All Equipment Listings
app.get('/api/admin/equipment/all', async (req, res) => {
    try {
        const sql = `
            SELECT e.id, e.name, e.category, e.price, e.condition_status, u.name as seller_name
            FROM equipment e
            JOIN users u ON e.seller_id = u.id
            ORDER BY e.id DESC
        `;
        const [equipment] = await db.query(sql);
        res.json(equipment);
    } catch (error) {
        console.error('Error fetching all equipment for admin:', error);
        res.status(500).json({ success: false, message: 'Failed to load all equipment listings.' });
    }
});

// Admin: Delete Equipment
app.delete('/api/admin/equipment/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM equipment WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Equipment listing not found.' });
        }
        res.json({ success: true, message: `Equipment ID ${id} deleted successfully.` });
    } catch (error) {
        console.error('Error deleting equipment listing:', error);
        res.status(500).json({ success: false, message: 'Failed to delete equipment listing.' });
    }
});

// Admin: Fetch All Comments
app.get('/api/admin/comments/all', async (req, res) => {
    try {
        const sql = `
            SELECT
                c.id, c.parent_id, c.text, c.timestamp, c.user_id,
                c.page_identifier,
                u.name AS authorName, u.email, u.contact_number,
                u.profile_picture_url, u.years_experience, u.location
            FROM comments c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.timestamp DESC;
        `;
        const [comments] = await db.query(sql);

        const processedComments = comments.map(comment => {
            if (comment.profile_picture_url) {
                comment.profile_picture_url = getPublicUrl(req, comment.profile_picture_url);
            }
            return comment;
        });

        res.status(200).json(processedComments);
    } catch (err) {
        console.error('Error fetching all comments for admin:', err);
        res.status(500).json({ success: false, message: 'Failed to load all comments.' });
    }
});

// Admin: Save or Update Government Scheme
app.post('/api/admin/schemes/save', async (req, res) => {
    const { id, name, category, description, eligibility, documents, roadmap, link, state, help_link } = req.body;

    try {
        const schemeId = (id && id !== 'null' && id !== 'undefined' && !isNaN(id)) ? parseInt(id) : null;

        if (schemeId) {
            const sql = `UPDATE schemes SET name=?, category=?, description=?, eligibility=?, documents=?, roadmap=?, link=?, state=?, help_link=? WHERE id=?`;
            await db.query(sql, [name, category, description, eligibility, documents, roadmap, link, state, help_link, schemeId]);
            res.json({ success: true, message: 'Scheme updated successfully!', id: schemeId });
        } else {
            const sql = `INSERT INTO schemes (name, category, description, eligibility, documents, roadmap, link, state, help_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const [result] = await db.query(sql, [name, category, description, eligibility, documents, roadmap, link, state, help_link]);
            res.json({ success: true, message: 'New scheme added successfully!', id: result.insertId });
        }
    } catch (error) {
        console.error('Save Error:', error);
        res.status(500).json({ success: false, message: 'Database error. Check column names.' });
    }
});

// Admin: Delete Scheme
app.delete('/api/admin/schemes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM schemes WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Scheme not found.' });
        }
        res.json({ success: true, message: 'Deleted successfully.' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ success: false, message: 'Server error during deletion.' });
    }
});

// Admin: Save or Update Article
app.post('/api/admin/articles/save', async (req, res) => {
    const { id, title, category, content, image_url, date } = req.body;
    try {
        if (id) {
            const sql = 'UPDATE articles SET title=?, category=?, content=?, image_url=?, published_at=? WHERE id=?';
            await db.query(sql, [title, category, content, image_url, date || new Date(), id]);
            res.json({ success: true, message: 'Updated' });
        } else {
            const sql = 'INSERT INTO articles (title, category, content, image_url, published_at) VALUES (?, ?, ?, ?, ?)';
            await db.query(sql, [title, category, content, image_url, date || new Date()]);
            res.json({ success: true, message: 'Published' });
        }
    } catch (err) {
        console.error('Error saving article:', err);
        res.status(500).json({ success: false, message: 'Database error during save.' });
    }
});

// Admin: Delete Article
app.delete('/api/admin/articles/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        console.error('Error deleting article:', err);
        res.status(500).json({ success: false, message: 'Failed to delete article.' });
    }
});

// ==================================================
// SERVER START - ONLY ONE
// ==================================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💬 Chat available at: /chat`);
});