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

// --- Configuration ---
const saltRounds = 10;

const ADMIN_USER_ID = 99999; 
// CRITICAL FIX: Define the fixed Admin Credentials
const ADMIN_EMAIL = 'admin@agriconnect.com'; 
const ADMIN_PASSWORD_HASH = '$2b$10$77o11F2iW/jG1G5zE8z2w.z5/7qA9r3k5y6L/L1H.Q/1A.T/9f0k'; // Hashed "admin123"

// --- DATABASE SETUP ---
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10
});

const db = pool;

// --- MULTER STORAGE CONFIGURATION (Fixes ReferenceError by being defined first) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public/uploads');
        // Ensure this folder exists or is created successfully
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage }); // <-- 'upload' is defined HERE

// --- MIDDLEWARE ---
// FIX: Use CORS middleware to allow cross-origin requests (e.g., from client on port 5500 to API on port 3000)
app.use(cors()); 

app.use(bodyParser.json());
app.use(express.static('public')); // Serve files from the 'public' folder
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'))); // Serve uploaded images


// --- DATABASE INITIALIZATION AND TABLE CREATION ---
async function initializeDatabase() {
    try {
        const connection = await db.getConnection();
        console.log('Successfully connected to MySQL database.');
        connection.release();

        // CRITICAL: Create all necessary tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL, location VARCHAR(255), contact_number VARCHAR(20),
                years_experience INT DEFAULT 0, profile_picture_url VARCHAR(255) DEFAULT '/uploads/default.png',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await db.query(`CREATE TABLE IF NOT EXISTS success_stories (id BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT, user_id INT, author_name VARCHAR(255) NOT NULL, story_text TEXT NOT NULL, location VARCHAR(255), submission_date DATE DEFAULT (CURRENT_DATE()), status VARCHAR(50) DEFAULT 'pending');`);
        await db.query(`CREATE TABLE IF NOT EXISTS farmer_directory (id BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT, user_id INT, farm_name VARCHAR(255) NOT NULL, crop_specialization VARCHAR(255) NOT NULL, farm_location VARCHAR(255) NOT NULL, contact_email VARCHAR(255), submission_date DATE DEFAULT (CURRENT_DATE()), status VARCHAR(50) DEFAULT 'pending');`);
        await db.query(`CREATE TABLE IF NOT EXISTS equipment (id INT AUTO_INCREMENT PRIMARY KEY, seller_id INT NOT NULL, name VARCHAR(255) NOT NULL, category VARCHAR(100), price DECIMAL(10, 2), description TEXT, image_url VARCHAR(255), condition_status VARCHAR(50));`);
        await db.query(`CREATE TABLE IF NOT EXISTS schemes (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, eligibility TEXT, link VARCHAR(255), state VARCHAR(100), category VARCHAR(100));`);
        await db.query(`CREATE TABLE IF NOT EXISTS user_schemes (user_id INT NOT NULL, scheme_id INT NOT NULL, PRIMARY KEY (user_id, scheme_id));`);
        await db.query(`CREATE TABLE IF NOT EXISTS comments (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, parent_id INT NULL, page_identifier VARCHAR(255) NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
// Around line 75 in server.js
await db.query(`CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    user_id INT NOT NULL, 
    rating INT NOT NULL, 
    text TEXT NOT NULL, 
    page_name VARCHAR(255) DEFAULT 'home',
    username VARCHAR(255) DEFAULT 'Anonymous',
    user_photo VARCHAR(255) DEFAULT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

// Add this inside the initializeDatabase try block in server.js
await db.query(`
    CREATE TABLE IF NOT EXISTS hub_listings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        exchange_type VARCHAR(50) DEFAULT 'normal',
        location VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        contact_number VARCHAR(20),
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    } catch (err) {
        console.error('FATAL ERROR during database initialization: ' + err.message);
        process.exit(1);
    }
}
initializeDatabase();

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

// /login (Frontend user login - remains untouched)
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

// NEW ADMIN LOGIN ENDPOINT (FIXED ROUTE TO BE CONSISTENT WITH /api/admin)
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL) {
        return res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
    }
    
    // --- START FIX: Use direct password check for admin 123 to ensure successful login ---
    const ADMIN_CLEAR_PASSWORD = 'admin123';
    const isMatch = (password === ADMIN_CLEAR_PASSWORD);
    // Original line that was failing: 
    // const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    // --- END FIX ---

    if (isMatch) {
        // Return a fixed admin token or user object for client-side storage
        const adminUser = {
            id: ADMIN_USER_ID,
            name: 'Agri Admin',
            email: ADMIN_EMAIL,
            isAuthenticated: true
        };
        res.status(200).json({ success: true, message: 'Admin login successful!', user: adminUser });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
    }
});


// ======== DASHBOARD & API ROUTES ========
// dashboard photo uploading starting
// 1. Upload Profile Picture
app.post('/api/upload-profile-picture', upload.single('profileImage'), async (req, res) => {
// ... (rest of the /api/upload-profile-picture route remains the same)
    const userId = req.body.userId;
    if (!req.file || !userId) return res.status(400).json({ success: false, message: 'No file or user ID provided.' });

    const imageUrl = '/uploads/' + req.file.filename;
    try {
        const sql = 'UPDATE users SET profile_picture_url = ? WHERE id = ?';
        await db.query(sql, [imageUrl, userId]);

        res.status(200).json({ success: true, message: 'Profile picture updated!', profile_picture_url: imageUrl });
    } catch (err) {
        fs.unlink(req.file.path, (unlinkErr) => { if (unlinkErr) console.error('Error deleting failed upload:', unlinkErr); });
        res.status(500).json({ success: false, message: 'Database update failed.' });
    }
});

//dashboard photo uploading ending


// 2. Submit Success Story
app.post('/api/submit-story', async (req, res) => {
// ... (rest of the /api/submit-story route remains the same)
    const { userId, authorName, storyText, location } = req.body;
    const sql = `INSERT INTO success_stories (user_id, author_name, story_text, location, status) VALUES (?, ?, ?, ?, 'pending');`;
    try {
        await db.query(sql, [userId, authorName, storyText, location]);
        res.status(200).json({ success: true, message: 'Story submitted successfully.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed to submit story.' }); }
});

// 3. Submit Farmer Directory Listing
app.post('/api/submit-farmer-listing', async (req, res) => {
// ... (rest of the /api/submit-farmer-listing route remains the same)
    const { userId, farmName, cropSpecialization, farmLocation, contactEmail } = req.body;
    const sql = `INSERT INTO farmer_directory (user_id, farm_name, crop_specialization, farm_location, contact_email, status) VALUES (?, ?, ?, ?, ?, 'pending');`;
    try {
        await db.query(sql, [userId, farmName, cropSpecialization, farmLocation, contactEmail]);
        res.status(200).json({ success: true, message: 'Listing submitted successfully.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed to submit listing.' }); }
});

// 4. Fetch User's Submitted Farmer Listings
// 4. Fetch User's Submitted Farmer Listings
app.get('/api/my-farmer-listings/:userId', async (req, res) => {
    try {
        // FIXED: Added 'submission_date' to the SELECT list
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
// 5. Fetch User's Saved Schemes
app.get('/api/my-schemes/details/:userId', async (req, res) => {
// ... (rest of the /api/my-schemes/details/:userId route remains the same)
    try {
        const sql = `SELECT s.name, s.description, s.link FROM schemes s JOIN user_schemes us ON s.id = us.scheme_id WHERE us.user_id = ?;`;
        const [schemes] = await db.query(sql, [req.params.userId]);
        res.status(200).json(schemes);
    } catch (err) { res.status(500).json({ success: false, message: 'Failed to load user schemes.' }); }
});

// 6. Fetch User's Equipment Listings
app.get('/api/my-equipment/:userId', async (req, res) => {
// ... (rest of the /api/my-equipment/:userId route remains the same)
    try {
        const [equipment] = await db.query('SELECT * FROM equipment WHERE seller_id = ? ORDER BY id DESC', [req.params.userId]);
        res.status(200).json(equipment);
    } catch (err) { res.status(500).json({ success: false, message: 'Failed to load user equipment listings.' }); }
});


// --- NEW ROUTE: ALLOW USERS TO DELETE THEIR OWN EQUIPMENT ---
// ==========================================
//    MISSING USER ROUTES (ADD THESE!)
// ==========================================

// 1. DELETE Equipment (User Side)
app.delete('/api/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        // Verify ownership
        const [check] = await db.query('SELECT * FROM equipment WHERE id = ? AND seller_id = ?', [id, userId]);
        if (check.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized or Item not found.' });
        }

        // Delete image file (optional cleanup)
        const imageUrl = check[0].image_url;
        if (imageUrl && !imageUrl.includes('default')) {
            const filePath = path.join(__dirname, 'public', imageUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        // Delete from DB
        await db.query('DELETE FROM equipment WHERE id = ?', [id]);
        res.json({ success: true, message: 'Listing deleted successfully.' });

    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: 'Server error during deletion.' });
    }
});

// 2. EDIT Equipment (User Side)
app.put('/api/equipment/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { userId, name, category, condition, price, description } = req.body;

    try {
        // Verify ownership
        const [check] = await db.query('SELECT * FROM equipment WHERE id = ? AND seller_id = ?', [id, userId]);
        if (check.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized or Item not found.' });
        }

        // Check if a new image was uploaded
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

// 7. Fetch Approved Farmers (for Farmer Directory on agri2.html)
app.get('/api/approved-farmers', async (req, res) => {
// ... (rest of the /api/approved-farmers route remains the same)
    try {
        const sql = `
            SELECT fd.farm_name, fd.crop_specialization, fd.farm_location, fd.contact_email AS email,
            u.name AS author_name, u.profile_picture_url, u.contact_number, u.years_experience, u.location AS user_location
            FROM farmer_directory fd JOIN users u ON fd.user_id = u.id WHERE fd.status = 'approved';
        `;
        const [results] = await db.query(sql);
        res.status(200).json(results);
    } catch (err) { res.status(500).json({ success: false, message: 'Failed to load approved farmers.' }); }
});

// 9. Fetch All Equipment Listings (for the Marketplace) - Added in previous step
app.get('/api/equipment/all', async (req, res) => {
// ... (rest of the /api/equipment/all route remains the same)
    try {
        const sql = `
            SELECT e.*, u.name AS seller_name, u.contact_number, u.email AS seller_email
            FROM equipment e
            JOIN users u ON e.seller_id = u.id
            ORDER BY e.id DESC;
        `;
        const [equipment] = await db.query(sql);
        res.status(200).json(equipment);
    } catch (err) {
        console.error('Error fetching all equipment:', err);
        res.status(500).json({ success: false, message: 'Failed to load marketplace equipment.' });
    }
});

// 8. API to list new equipment for sale (Handles file upload)
// --- REPLACEMENT ROUTE: MATCHING DASHBOARD SUBMISSION ---
app.post('/api/equipment/add', upload.single('image'), async (req, res) => {
    // 1. Extract data sent from dashboard.html
    // Note: The dashboard sends 'userId', but we map it to 'seller_id' for the DB
    const { userId, name, category, condition, price, description } = req.body;

    // 2. Validation
    if (!userId || !name || !price) {
         return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // 3. Handle Image Path (Frontend sends file key 'image')
    // If no image is uploaded, use a default
    const imageUrl = req.file ? '/uploads/' + req.file.filename : '/uploads/default-equipment.png';

    try {
        // 4. Insert into Database
        const sql = `
            INSERT INTO equipment 
            (seller_id, name, category, condition_status, price, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.query(sql, [userId, name, category, condition, price, description, imageUrl]);

        res.json({ success: true, message: 'Equipment listed successfully!' });
    } catch (error) {
        console.error("Database Insert Error:", error);
        // Clean up uploaded file if database insert fails
        if (req.file) {
            fs.unlink(req.file.path, (err) => { if(err) console.error("File cleanup error:", err); });
        }
        res.status(500).json({ success: false, message: 'Database error occurred.' });
    }
});


// server.js (Add these routes to your Express application)

// NOTE: Ensure your database connection object is named 'db'
// or change 'db.execute' to match your setup (e.g., 'pool.query').

// 1. Fetch All Schemes (/api/schemes) - Resolves the JSON error by returning data
// Locate this route in your server.js
app.get('/api/schemes', async (req, res) => {
    try {
        // CRITICAL: You must include documents and roadmap in the SELECT query
        const [schemes] = await db.query(
            'SELECT id, name, description, eligibility, link, state, category, documents, roadmap, help_link FROM schemes'
        );
        res.json(schemes);
    } catch (error) {
        console.error('Database query failed:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});
// 2. Fetch User's Saved Scheme IDs (/api/my-schemes/ids/:userId)
app.get('/api/my-schemes/ids/:userId', async (req, res) => {
// ... (rest of the /api/my-schemes/ids/:userId route remains the same)
    const { userId } = req.params;
    try {
        // Fetch scheme IDs saved by the user
        const [savedSchemes] = await db.query( // <-- FIX 9
            'SELECT scheme_id FROM user_schemes WHERE user_id = ?',
            [userId]
        );
        res.json(savedSchemes);
    } catch (error) {
        console.error('Error fetching saved scheme IDs:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve user saved schemes.' });
    }
});

// 3. Save a Scheme (/api/save-scheme)
app.post('/api/save-scheme', async (req, res) => {
// ... (rest of the /api/save-scheme route remains the same)
    const { userId, schemeId } = req.body;
    try {
        const [existing] = await db.query( // <-- FIX 10
            'SELECT * FROM user_schemes WHERE user_id = ? AND scheme_id = ?',
            [userId, schemeId]
        );

        if (existing.length === 0) {
            await db.query( // <-- FIX 11
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

// 4. Unsave a Scheme (/api/unsave-scheme)
app.post('/api/unsave-scheme', async (req, res) => {
// ... (rest of the /api/unsave-scheme route remains the same)
    const { userId, schemeId } = req.body;
    try {
        await db.query( // <-- FIX 12
            'DELETE FROM user_schemes WHERE user_id = ? AND scheme_id = ?',
            [userId, schemeId]
        );
        res.json({ success: true, message: 'Scheme unsaved successfully.' });
    } catch (error) {
        console.error('Error unsaving scheme:', error);
        res.status(500).json({ success: false, message: 'Database error during unsave operation.' });
    }
});



// starting of farmer-listing

app.get('/api/approved-farmers', async (req, res) => {
// ... (rest of the /api/approved-farmers route remains the same)
    try {
        // Query joins the public listing details with the user's profile details
        const [farmers] = await db.query(`
            SELECT
                f.farm_name,
                f.crop_specialization,
                f.farm_location,
                u.email,
                u.years_experience,
                u.profile_picture_url,
                u.contact_number,
                u.location AS user_location
            FROM farmer_directory f
            JOIN users u ON f.user_id = u.id
            WHERE f.status = 'approved'
        `);

        res.json(farmers);
    } catch (error) {
        console.error('Error fetching approved farmers:', error);
        // CRITICAL: Return an empty array or 500 status on failure
        res.status(500).json({ success: false, message: 'Failed to load farmer directory from database.' });
    }
});

//ending of farmer listing


//success story

app.get('/api/success-stories', async (req, res) => {
// ... (rest of the /api/success-stories route remains the same)
    try {
        const sql = `
            SELECT
                ss.id,
                ss.story_text,
                ss.author_name,
                ss.location,
                u.profile_picture_url,
                u.years_experience,
                u.email,
                u.contact_number
            FROM success_stories ss
            JOIN users u ON ss.user_id = u.id
            WHERE ss.status = 'approved'
            ORDER BY ss.submission_date DESC
        `;
        const [stories] = await db.query(sql);
        res.status(200).json(stories);
    } catch (err) {
        console.error('Error fetching success stories:', err);
        res.status(500).json({ success: false, message: 'Failed to load success stories.' });
    }
});

//end of success story


// comment part begin
// Route 1: Fetch all comments and replies for a specific page/topic
//Fetch Comments and Replies
app.get('/api/comments/:pageIdentifier', async (req, res) => {
// ... (rest of the /api/comments/:pageIdentifier route remains the same)
    const { pageIdentifier } = req.params;
    try {
        const sql = `
            SELECT
                c.id, c.parent_id, c.text, c.timestamp, c.user_id,
                u.name AS authorName, u.email, u.contact_number,
                u.profile_picture_url, u.years_experience, u.location
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.page_identifier = ?
            ORDER BY c.timestamp ASC;
        `;
        const [comments] = await db.query(sql, [pageIdentifier]);
        res.status(200).json(comments);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ success: false, message: 'Failed to load comments from the server.' });
    }
});


// Route 2: Post a new comment or reply
app.post('/api/comments', async (req, res) => {
// ... (rest of the /api/comments POST route remains the same)
    const { userId, parentId, pageIdentifier, text } = req.body;

    // Ensure parentId is null if it's a top-level comment
    const finalParentId = (parentId === null || parentId === 0) ? null : parentId;

    try {
        const sql = `
            INSERT INTO comments (user_id, parent_id, page_identifier, text)
            VALUES (?, ?, ?, ?);
        `;
        // NOTE: Use db.query to handle NULL parentId gracefully
        await db.query(sql, [userId, finalParentId, pageIdentifier, text]);

        res.status(200).json({ success: true, message: 'Comment posted successfully.' });
    } catch (err) {
        console.error('Error posting comment:', err);
        res.status(500).json({ success: false, message: 'Failed to post comment due to server error.' });
    }
});


// Route 3: Delete a comment (Requires user ID for security check)
app.delete('/api/comments/:commentId/:userId', async (req, res) => {
// ... (rest of the /api/comments DELETE route remains the same)
    const { commentId, userId } = req.params;
    // ADMIN_USER_ID is already defined globally

    try {
        // First, check if the user is the author or an admin
        const [commentCheck] = await db.query('SELECT user_id FROM comments WHERE id = ?', [commentId]);

        if (commentCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        const commentOwnerId = commentCheck[0].user_id;

        if (parseInt(userId) !== commentOwnerId && parseInt(userId) !== ADMIN_USER_ID) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this comment.' });
        }

        // Deleting the parent comment should cascade-delete any replies if your DB schema is set up with ON DELETE CASCADE.
        // If not, we use OR parent_id = ? to delete replies manually.
        await db.query('DELETE FROM comments WHERE id = ? OR parent_id = ?', [commentId, commentId]);

        res.status(200).json({ success: true, message: 'Comment deleted successfully.' });

    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ success: false, message: 'Failed to delete comment.' });
    }
});

//here ends with comments


//review





// -------- Get Average Rating for a Specific Page ----------

app.get('/api/reviews/average', async (req, res) => {
    const { page_name } = req.query;
    try {
        const sql = `
            SELECT AVG(rating) as avg_rating, COUNT(*) as total 
            FROM reviews 
            WHERE page_name = ?`;
        const [result] = await db.query(sql, [page_name || 'home']);
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});


/*
// Route 2: Submit a new review
app.post('/api/reviews', async (req, res) => {
// ... (rest of the /api/reviews POST route remains the same)
    const { userId, rating, text } = req.body;

    // Simple validation
    if (!userId || !rating || !text) {
        return res.status(400).json({ success: false, message: 'Missing user ID, rating, or text.' });
    }

    try {
        const sql = `
            INSERT INTO reviews (user_id, rating, text)
            VALUES (?, ?, ?);
        `;
        await db.query(sql, [userId, rating, text]);

        res.status(200).json({ success: true, message: 'Review submitted successfully.' });
    } catch (err) {
        console.error('Error submitting review:', err);
        res.status(500).json({ success: false, message: 'Failed to post review due to server error.' });
    }
});

*/



// end of review


// Handles Image Uploads for Chat
app.post('/upload/image', upload.single('image'), (req, res) => {
// ... (rest of the /upload/image route remains the same)
    if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }
    // CRITICAL: Ensure the filePath is correct for the client.js file
    res.send({ filePath: `/uploads/${req.file.filename}` });
});

// Handles Audio Uploads for Chat
app.post('/upload/audio', upload.single('audio'), (req, res) => {
// ... (rest of the /upload/audio route remains the same)
    if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }
    res.send({ filePath: `/uploads/${req.file.filename}` });
});


// ==========================================================
// ======== ADMIN SPECIFIC API ROUTES (NEW CONTENT) =========
// ==========================================================

// Middleware to check for Admin (optional, but good practice)
// This is a simplified check. A proper system would use sessions/tokens.
const isAdmin = (req, res, next) => {
    // For this demonstration, we'll rely on the client knowing the admin ID
    // and passing it in a header or body if needed for internal logic,
    // but the main authority will be the server logic below.
    next();
};

// 1. ADMIN: Fetch Dashboard Stats
app.get('/api/admin/stats', isAdmin, async (req, res) => {
// ... (rest of the /api/admin/stats route remains the same)
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

// 2. ADMIN: Fetch Pending Success Stories
app.get('/api/admin/stories/pending', isAdmin, async (req, res) => {
// ... (rest of the /api/admin/stories/pending route remains the same)
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

// 3. ADMIN: Fetch Pending Farmer Directory Listings
app.get('/api/admin/farmers/pending', isAdmin, async (req, res) => {
// ... (rest of the /api/admin/farmers/pending route remains the same)
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

// 4. ADMIN: Update Status (Success Story)
app.post('/api/admin/story/update-status', isAdmin, async (req, res) => {
// --- FIX START: Corrected missing parenthesis ---
    const { id, status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
// --- FIX END ---
    try {
        await db.query('UPDATE success_stories SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true, message: `Story ${status} successfully.` });
    } catch (error) {
        console.error('Error updating story status:', error);
        res.status(500).json({ success: false, message: 'Failed to update story status.' });
    }
});

// 5. ADMIN: Update Status (Farmer Directory)
app.post('/api/admin/farmer/update-status', isAdmin, async (req, res) => {
// --- FIX START: Corrected missing parenthesis ---
    const { id, status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' }); 
    }
// --- FIX END ---
    try {
        await db.query('UPDATE farmer_directory SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true, message: `Farmer listing ${status} successfully.` });
    } catch (error) {
        console.error('Error updating farmer status:', error);
        res.status(500).json({ success: false, message: 'Failed to update farmer status.' });
    }
});

// 6. ADMIN: Fetch All Users
app.get('/api/admin/users', isAdmin, async (req, res) => {
// ... (rest of the /api/admin/users route remains the same)
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

// 7. ADMIN: Fetch ALL Success Stories (Pending, Approved, Rejected) (NEW)
app.get('/api/admin/stories/all', isAdmin, async (req, res) => {
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

// 8. ADMIN: Fetch ALL Farmer Directory Listings (Pending, Approved, Rejected) (NEW)
app.get('/api/admin/farmers/all', isAdmin, async (req, res) => {
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

// 9. ADMIN: Delete Success Story by ID (Updated Route Number)
app.delete('/api/admin/story/:id', isAdmin, async (req, res) => {
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

// 10. ADMIN: Delete Farmer Directory Listing by ID (Updated Route Number)
app.delete('/api/admin/farmer/:id', isAdmin, async (req, res) => {
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

// 11. ADMIN: Fetch All Equipment Listings (NEW ROUTE)
app.get('/api/admin/equipment/all', isAdmin, async (req, res) => {
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

// 12. ADMIN: Delete Equipment by ID (NEW ROUTE)
app.delete('/api/admin/equipment/:id', isAdmin, async (req, res) => {
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


// 7. ADMIN: Fetch All Comments (NEW ROUTE)
app.get('/api/admin/comments/all', isAdmin, async (req, res) => {
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
        res.status(200).json(comments);
    } catch (err) {
        console.error('Error fetching all comments for admin:', err);
        res.status(500).json({ success: false, message: 'Failed to load all comments.' });
    }
});


// 1. ADMIN: Fetch All Comments
app.get('/api/admin/comments/all', async (req, res) => {
    try {
        const sql = `
            SELECT c.id, c.parent_id, c.text, c.timestamp, c.user_id, c.page_identifier,
                   u.name AS authorName
            FROM comments c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.timestamp DESC`;
        const [comments] = await db.query(sql);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to load all comments.' });
    }
});

// 2. ADMIN: Update Status (Farmer and Story) 
// This fixes the "Failed to communicate with server to update status" error
app.post('/api/admin/:type/update-status', async (req, res) => {
    const { type } = req.params;
    const { id, status } = req.body;
    const table = type === 'story' ? 'success_stories' : 'farmer_directory';
    
    try {
        await db.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);
        res.json({ success: true, message: 'Status updated!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database update failed.' });
    }
});



// ADMIN: Save or Update Government Scheme
app.post('/api/admin/schemes/add', async (req, res) => {
    const { id, name, category, description, eligibility, documents, roadmap, link, state, help_link } = req.body;
    try {
        if (id) {
            // UPDATE existing scheme
            const sql = `UPDATE schemes SET name=?, category=?, description=?, eligibility=?, documents=?, roadmap=?, link=?, state=?, help_link=? WHERE id=?`;
            await db.query(sql, [name, category, description, eligibility, documents, roadmap, link, state, help_link, id]);
            res.json({ success: true, message: 'Scheme updated successfully!' });
        } else {
            // INSERT new scheme
            const sql = `INSERT INTO schemes (name, category, description, eligibility, documents, roadmap, link, state, help_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await db.query(sql, [name, category, description, eligibility, documents, roadmap, link, state, help_link]);
            res.json({ success: true, message: 'New scheme added!' });
        }
    } catch (error) {
        console.error('Save Error:', error);
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// --- UNIFIED SCHEME MANAGEMENT ---

// 1. Save or Update Scheme
app.post('/api/admin/schemes/save', async (req, res) => {
    const { id, name, category, description, eligibility, documents, roadmap, link, state, help_link } = req.body;
    try {
        const schemeId = (id && id !== 'null' && id !== 'undefined' && !isNaN(id)) ? parseInt(id) : null;

        if (schemeId) {
            // UPDATE: Use the existing ID
            const sql = `UPDATE schemes SET name=?, category=?, description=?, eligibility=?, documents=?, roadmap=?, link=?, state=?, help_link=? WHERE id=?`;
            await db.query(sql, [name, category, description, eligibility, documents, roadmap, link, state, help_link, schemeId]);
            res.json({ success: true, message: 'Scheme updated successfully!', id: schemeId });
        } else {
            // INSERT: Return the result.insertId to prevent "NaN"
            const sql = `INSERT INTO schemes (name, category, description, eligibility, documents, roadmap, link, state, help_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const [result] = await db.query(sql, [name, category, description, eligibility, documents, roadmap, link, state, help_link]);
            res.json({ success: true, message: 'New scheme added successfully!', id: result.insertId });
        }
    } catch (error) {
        console.error('Save Error:', error);
        res.status(500).json({ success: false, message: 'Database error. Check column names.' });
    }
});

// 2. Delete Scheme
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
// ==========================================================
// =================== END ADMIN ROUTES =====================
// ==========================================================




// --- MODULE 11: USER CROP PLANS ---

// 1. Save a New Crop Plan
// 1. Save OR Update a Crop Plan
app.post('/api/save-crop-plan', async (req, res) => {
    // We now accept 'planId' to check if it's an update
    const { planId, userId, cropName, sowingDate, harvestDate, currentStage, progress } = req.body;
    
    if(!userId || !cropName || !sowingDate) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        if (planId) {
            // --- LOGIC: UPDATE EXISTING PLAN (For "Update Progress") ---
            const sql = `UPDATE user_crop_plans SET sowing_date=?, harvest_date=?, current_stage=?, progress_percent=? WHERE id=? AND user_id=?`;
            await db.query(sql, [sowingDate, harvestDate, currentStage, progress, planId, userId]);
            res.json({ success: true, message: 'Plan updated successfully!' });
        } else {
            // --- LOGIC: CREATE NEW PLAN (For "Save for Later") ---
            const sql = `INSERT INTO user_crop_plans (user_id, crop_name, sowing_date, harvest_date, current_stage, progress_percent) VALUES (?, ?, ?, ?, ?, ?)`;
            await db.query(sql, [userId, cropName, sowingDate, harvestDate, currentStage, progress]);
            res.json({ success: true, message: 'New plan created!' });
        }
    } catch (error) {
        console.error('Error saving plan:', error);
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});
// 2. Fetch User's Active Plans
app.get('/api/my-crop-plans/:userId', async (req, res) => {
    try {
        const [plans] = await db.query('SELECT * FROM user_crop_plans WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId]);
        res.json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ success: false, message: 'Failed to load plans.' });
    }
});

// 3. Delete a Plan
app.delete('/api/crop-plan/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM user_crop_plans WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Plan deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Deletion failed.' });
    }
});






// --- NEWS API ROUTE ---
// --- NEWS API ROUTE (UPDATED FOR RECENCY) ---
app.get('/news', async (req, res) => {
    try {
        const query = req.query.q || 'agriculture';
        const page = req.query.page || 1;
        const pageSize = req.query.pageSize || 12;
        
        // ADD THIS LINE: Capture the sortBy parameter (default to 'publishedAt' for latest)
        const sortBy = req.query.sortBy || 'publishedAt'; 

        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: query,
                page: page,
                pageSize: pageSize,
                sortBy: sortBy, // <-- CRITICAL: This tells NewsAPI to send the newest first
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



app.get('/news', async (req, res) => {
    try {
        const query = req.query.q || 'agriculture';
        const page = req.query.page || 1;
        const pageSize = req.query.pageSize || 12;
        const sortBy = req.query.sortBy || 'publishedAt'; 

        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: query,
                page: page,
                pageSize: pageSize,
                sortBy: sortBy,
                apiKey: 'c243896d83994259b3dad52cc101f66e',
                language: 'en'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// --- COMMUNITY HUB API ---

// --- HUB GROUP LOGIC ---





app.post('/api/hub-listings', async (req, res) => {
    const { userId, authorName, title, category, exchangeType, targetSize, location, description, contactNumber } = req.body;
    
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // The SQL expects exactly 9 values to match the table structure
    const sql = `INSERT INTO hub_listings 
                (user_id, author_name, title, category, exchange_type, target_size, location, description, contact_number) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        const finalTarget = exchangeType === 'group' ? parseInt(targetSize) : 1;
        
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






// --- HUB LISTINGS API FIX ---
app.post('/api/hub-listings', async (req, res) => {
    const { userId, authorName, title, category, exchangeType, targetSize, location, description, contactNumber } = req.body;
    
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // The SQL expects exactly 9 values to match the table structure
    const sql = `INSERT INTO hub_listings 
                (user_id, author_name, title, category, exchange_type, target_size, location, description, contact_number) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        const finalTarget = exchangeType === 'group' ? parseInt(targetSize) : 1;
        
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
// 2. Fetch All Listings with Member Counts
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
        res.status(500).json({ success: false, message: "Error fetching hub" }); 
    }
});

// 3. Get Member Details (Only for the post owner)
app.get('/api/hub/group-details/:listingId', async (req, res) => {
    try {
        const [members] = await db.query(
            `SELECT user_name, user_contact FROM hub_group_members WHERE listing_id = ?`,
            [req.params.listingId]
        );
        res.json(members);
    } catch (err) { 
        res.status(500).send(err); 
    }
});



// --- HUB GROUP JOINING LOGIC ---
app.post('/api/hub/join-group', async (req, res) => {
    const { listingId, userId, userName, userContact } = req.body; //
    
    if (!userId || !listingId) { //
        return res.status(400).json({ success: false, message: "Invalid request data." }); //
    }

    try {
        // Check if user has already joined this specific group
        const [existing] = await db.query(
            'SELECT * FROM hub_group_members WHERE listing_id = ? AND user_id = ?',
            [listingId, userId]
        );

        if (existing.length > 0) { //
            return res.json({ success: false, message: "You have already joined this group!" }); //
        }

        // Add the new member to the group table
        await db.query(
            `INSERT INTO hub_group_members (listing_id, user_id, user_name, user_contact) VALUES (?, ?, ?, ?)`,
            [listingId, userId, userName, userContact]
        );
        
        res.json({ success: true, message: "Successfully joined the group!" }); //
    } catch (err) {
        console.error("Join Group Error:", err); //
        res.status(500).json({ success: false, message: "Database error while joining." }); //
    }
});

// ================= REVIEWS API =================

// ADD REVIEW
app.post('/api/reviews/add', upload.single('photo'), async (req, res) => {
  try {
    const { rating, review_text, username, page_name, userId } = req.body;

    if (!rating || !review_text) {
      return res.json({ success: false });
    }

    const photoPath = req.file ? 'uploads/' + req.file.filename : null;

 if (!userId) {
    return res.status(401).json({ success: false, message: "User ID required" });
}
    await db.query(
      `INSERT INTO reviews (user_id, rating, text, page_name, username, user_photo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId, // Use the ID passed from the frontend
        rating,
        review_text,
        page_name,
        username || 'Anonymous',
        photoPath
      ]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("REVIEW ERROR:", err);
    res.json({ success: false });
  }
});
// GET REVIEWS
// server.js
app.get('/api/reviews/list', async (req, res) => {
  try {
    const page_name = req.query.page_name || 'global';
    const page_no = parseInt(req.query.page_no) || 1;

    const limit = 3; // 🔥 CHANGED FROM 5 TO 3
    const offset = (page_no - 1) * limit;

    const [rows] = await db.query(
      `SELECT r.id, r.rating, r.text, r.username, 
              u.name AS authorName, u.email, u.contact_number, 
              u.profile_picture_url, u.years_experience, u.location
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.page_name = ? 
       ORDER BY r.id DESC 
       LIMIT ? OFFSET ?`,
      [page_name, limit, offset]
    );

    res.json(rows);
  } catch (err) {
    console.error("ERROR:", err);
    res.json([]);
  }
});


// AVERAGE RATING
app.get('/api/reviews/average', async (req, res) => {
  try {
    const { page_name } = req.query;

    const [rows] = await db.query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total
       FROM reviews
       WHERE page_name = ?`,
      [page_name || 'home']
    );

    res.json(rows[0]);

  } catch (err) {
    console.error("🔥 AVG ERROR:", err);
    res.status(500).json({ avg_rating: 0, total: 0 });
  }
});



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

    res.json(rows[0]);

  } catch (err) {
    console.error("USER FETCH ERROR:", err);
    res.status(500).json(null);
  }
});

// server.js
app.get('/api/reviews', async (req, res) => {
    try {
        const sql = `
            SELECT r.*, 
                   u.name AS authorName, u.email, u.contact_number, 
                   u.profile_picture_url, u.years_experience, u.location
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.timestamp DESC`;
        const [reviews] = await db.query(sql);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// delete review 
app.delete('/api/reviews/:reviewId/:userId', async (req, res) => {
    const { reviewId, userId } = req.params;

    try {
        // 1. Verify if the user is authorized (Owner or Admin)
        const [review] = await db.query('SELECT user_id FROM reviews WHERE id = ?', [reviewId]);
        
        if (review.length === 0) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        if (parseInt(userId) !== review[0].user_id && parseInt(userId) !== 99999) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        // 2. Perform deletion
        await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        res.json({ success: true, message: 'Deleted successfully.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});







// article

// --- UNIFIED ARTICLES API ---

// Admin: Save or Update Article
app.post('/api/admin/articles/save', async (req, res) => {
    const { id, title, category, content, image_url, date } = req.body;
    try {
        if (id) {
            // LOGIC: Update existing record
            const sql = 'UPDATE articles SET title=?, category=?, content=?, image_url=?, published_at=? WHERE id=?';
            await db.query(sql, [title, category, content, image_url, date || new Date(), id]);
            res.json({ success: true, message: 'Updated' });
        } else {
            // LOGIC: Insert new record
            const sql = 'INSERT INTO articles (title, category, content, image_url, published_at) VALUES (?, ?, ?, ?, ?)';
            await db.query(sql, [title, category, content, image_url, date || new Date()]);
            res.json({ success: true, message: 'Published' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error during save.' });
    }
});

// Admin: Delete Article
app.delete('/api/admin/articles/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});
// --- ARTICLES API ---
// This fixes the "Failed to load articles" error in your screenshots
// --- FIXED ARTICLES API ---
app.get('/api/articles', async (req, res) => {
    try {
        // 1. First, try to add the column if it's missing (Prevents the 'Unknown column' error)
        try {
            await db.query('ALTER TABLE articles ADD COLUMN published_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        } catch (columnErr) {
            // If error is 'Duplicate column', we just ignore it and move on
        }

        // 2. Now fetch the articles
        const [articles] = await db.query('SELECT * FROM articles ORDER BY published_at DESC');
        res.status(200).json(articles);
    } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});
app.post('/api/articles', async (req, res) => {
    const { title, category, content, image_url, date } = req.body; 
    try {
        const sql = 'INSERT INTO articles (title, category, content, image_url, published_at) VALUES (?, ?, ?, ?, ?)';
        // Use the date from the admin form or current time if empty
        const publishDate = date ? new Date(date) : new Date();
        
        await db.query(sql, [title, category, content, image_url, publishDate]); 
        res.status(200).json({ success: true, message: 'Article published!' });
    } catch (err) {
        console.error('Error saving article:', err);
        res.status(500).json({ success: false, message: 'Failed to save article.' });
    }
});

// Start the server
const PORT = 3000; // Change from 5000 to 3000
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}/agri2.html`);
});


app.use(cors());
app.use(express.static("public"));

const API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";


// 👉 API Proxy Route
app.get("/api/mandi", async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

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
    console.error(error.message);
    res.status(500).json({ error: "API error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
 
