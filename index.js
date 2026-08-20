const express = require("express");
const http = require("http");
const path = require("path"); 
const app = express();

const myserver = http.createServer(app);

// Initialize Socket.IO with CORS enabled for all origins
const io = require("socket.io")(myserver, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const users = {}; // Stores user names by socket ID


// --- Static Folder ---
// Serves static files (CSS, client.js, images, host.html) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// --- Main Page Route (Optional, depends on your setup) ---
app.get('/', (req, res) => {
  // We send host.html here, but the main app is likely accessed via server.js on port 3000
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

// --- Socket.IO Logic (Main Connection Handler) ---
// --- Socket.IO Logic (Main Connection Handler) ---
io.on("connection", (socket) => {
  
  // UPDATED: Accepts full userProfile object instead of just name string
  socket.on("new-user-joined", (userProfile) => {
    // Handle both object (new client) and string (legacy/fallback)
    // If it's an object (logged in user), use .name. If it's just a string (guest), use it directly.
    const name = (typeof userProfile === 'object' && userProfile.name) ? userProfile.name : userProfile;
    
    console.log(`User connected: ${name}`);
    
    // Store the FULL profile object so we can send it with messages later
    users[socket.id] = userProfile; 
    
    socket.broadcast.emit("user-joined", name);
    
    // Update user count for everyone
    io.emit("user-list-update", Object.values(users));
  });

  // Handles TEXT messages
  socket.on("send", (data) => {
    const user = users[socket.id];
    // Extract name safely whether 'user' is an object or a string
    const name = (typeof user === 'object' && user.name) ? user.name : user;
    
    if (!name) { 
        console.error("--- DEBUG ERROR: NAME IS UNDEFINED! Broadcast failed.");
        return; 
    }

    const time = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    
    // UPDATED: Broadcast userProfile along with the message
    socket.broadcast.emit("receive", { 
      message: data.message, 
      city: data.city,
      name: name,
      userProfile: typeof user === 'object' ? user : null, // Send full profile to client
      time: time 
    });
  });
  
  // Handles IMAGE messages
  socket.on("send-image", (data) => {
    const user = users[socket.id];
    const name = (typeof user === 'object' && user.name) ? user.name : user;
    
    const time = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    socket.broadcast.emit("receive-image", {
      filePath: data.filePath,
      city: data.city,
      name: name,
      userProfile: typeof user === 'object' ? user : null, // Send full profile
      time: time
    });
  });

  // Handles AUDIO messages
  socket.on("send-audio", (data) => {
    const user = users[socket.id];
    const name = (typeof user === 'object' && user.name) ? user.name : user;

    const time = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    socket.broadcast.emit("receive-audio", {
      filePath: data.filePath,
      city: data.city,
      name: name,
      userProfile: typeof user === 'object' ? user : null, // Send full profile
      time: time
    });
  });
  
  // Handles TYPING indicator
  socket.on("typing", () => {
    const user = users[socket.id];
    const name = (typeof user === 'object' && user.name) ? user.name : user;
    if (name) {
      socket.broadcast.emit("user-typing", name);
    }
  });

  socket.on("stop-typing", () => {
    socket.broadcast.emit("user-stop-typing");
  });

  // User disconnects
  socket.on("disconnect", () => {
    const user = users[socket.id];
    const name = (typeof user === 'object' && user.name) ? user.name : user;

    if(name) {
      socket.broadcast.emit("user-left", name);
      delete users[socket.id];
      // Update user count for everyone
      io.emit("user-list-update", Object.values(users));
    }
  });
});


// --- Server Start ---
myserver.listen(8000, () => {
 
});