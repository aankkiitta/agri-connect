(function() {
    console.log('🔄 KISAN CIRCLE Chat loaded...');
    console.log('📍 Current URL:', window.location.href);
    
    const SERVER_URL = window.location.origin;
    console.log('🔗 Server URL:', SERVER_URL);
    
    let socket = null;
    let currentUser = null;
    let currentReceiverId = null;
    let isConnected = false;
    let isTyping = false;
    let typingTimer;
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    
    // ========================================
    // GET USER FROM localStorage
    // ========================================
    function getCurrentUser() {
        console.log('🔍 Looking for user in localStorage...');
        try {
            const keys = ['agriUser', 'user', 'userData', 'authUser'];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const user = JSON.parse(data);
                        const userId = user.id || user.user_id || user.userId || user._id || null;
                        const email = user.email || null;
                        const name = user.name || user.username || 'User';
                        
                        if (userId || email) {
                            console.log(`✅ Found user in localStorage key: ${key}`, { id: userId, email, name });
                            return { id: parseInt(userId), email, name };
                        }
                    } catch (e) {
                        // Continue to next key
                    }
                }
            }
            
            console.warn('⚠️ No user data found in localStorage');
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }
    
    // ========================================
    // SAVE USER TO localStorage
    // ========================================
    function saveUser(userData) {
        try {
            localStorage.setItem('agriUser', JSON.stringify(userData));
            console.log('✅ User saved to localStorage');
            return true;
        } catch (error) {
            console.error('Error saving user:', error);
            return false;
        }
    }
    
    // ========================================
    // CLEAR USER FROM localStorage (Logout)
    // ========================================
    function clearUser() {
        try {
            const keys = ['agriUser', 'user', 'userData', 'authUser'];
            keys.forEach(key => localStorage.removeItem(key));
            console.log('✅ User cleared from localStorage');
            return true;
        } catch (error) {
            console.error('Error clearing user:', error);
            return false;
        }
    }
    
    // ========================================
    // GET RECEIVER ID FROM URL
    // ========================================
    function getReceiverIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('userId') || params.get('receiverId') || params.get('id') || params.get('with');
        if (id) {
            const parsedId = parseInt(id);
            if (!isNaN(parsedId) && parsedId > 0) {
                return parsedId;
            }
        }
        return null;
    }
    
    // ========================================
    // GET DOM ELEMENTS
    // ========================================
    function getElements() {
        const elements = {
            widget: document.getElementById('chat-widget-container'),
            form: document.getElementById('send-container'),
            messageInput: document.getElementById('messageimp'),
            messageContainer: document.getElementById('messageContainer'),
            userCountText: document.getElementById('user-count-text'),
            userCountDot: document.getElementById('user-count-dot'),
            attachFileBtn: document.getElementById('attach-file-btn'),
            imageInput: document.getElementById('image-input'),
            sendBtn: document.getElementById('send-btn'),
            recordBtn: document.getElementById('record-btn'),
            typingIndicator: document.getElementById('typing-indicator'),
            headerTitle: document.querySelector('nav h1'),
            chatInputArea: document.getElementById('chat-input-area')
        };
        
        if (!elements.messageContainer) {
            elements.messageContainer = document.querySelector('.container');
        }
        
        return elements;
    }
    
    // ========================================
    // SHOW LOGIN FORM
    // ========================================
    function showLoginForm() {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            container.innerHTML = `
                <nav>
                    <h1>🔐 KISAN CIRCLE</h1>
                    <button id="chat-widget-close" onclick="window.close()">&times;</button>
                </nav>
                <div id="login-prompt">
                    <div class="login-box">
                        <h2>🔐 Welcome Back</h2>
                        <p>Login to continue chatting</p>
                        <form class="login-form" id="chat-login-form">
                            <input type="email" id="login-email" placeholder="Email address" required>
                            <input type="password" id="login-password" placeholder="Password" required>
                            <button type="submit" class="login-btn" id="login-submit-btn">Login</button>
                            <div class="error-message" id="login-error"></div>
                            <div class="signup-link">
                                Don't have an account? <a href="/signup" target="_blank">Sign Up</a>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // Attach login handler
            const loginForm = document.getElementById('chat-login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
            }
        }
    }
    
    // ========================================
    // HANDLE LOGIN
    // ========================================
    async function handleLogin(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const errorDiv = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-submit-btn');
        
        if (!email || !password) {
            errorDiv.textContent = 'Please fill in all fields';
            return;
        }
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        errorDiv.textContent = '';
        
        try {
            const response = await fetch(`${SERVER_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success && data.user) {
                // Save user to localStorage
                saveUser(data.user);
                errorDiv.textContent = '';
                errorDiv.style.color = '#27ae60';
                errorDiv.textContent = '✅ Login successful!';
                
                // Reload the page to start chat
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                errorDiv.textContent = data.message || 'Invalid email or password';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = 'Server error. Please try again.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    }
    
    // ========================================
    // SHOW NO RECEIVER PROMPT
    // ========================================
    function showNoReceiverPrompt() {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            container.innerHTML = `
                <nav>
                    <h1>💬 KISAN CIRCLE</h1>
                    <div id="user-count-container">
                        <span id="user-count-dot"></span>
                        <span id="user-count-text">0</span>
                    </div>
                    <button id="chat-widget-close" onclick="window.close()">&times;</button>
                </nav>
                <div id="login-prompt">
                    <div class="login-box">
                        <h2>👤 SELECT A USER</h2>
                        <p>Please specify who you want to chat with.</p>
                        <p style="font-size:0.7rem;color:#999;margin-top:8px;">
                            Example: <code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;">/chat.html?userId=5</code>
                        </p>
                    </div>
                </div>
            `;
        }
    }
    
    // ========================================
    // SHOW USER NOT FOUND
    // ========================================
    function showUserNotFound(userId) {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            container.innerHTML = `
                <nav>
                    <h1>💬 KISAN CIRCLE</h1>
                    <button id="chat-widget-close" onclick="window.close()">&times;</button>
                </nav>
                <div id="login-prompt">
                    <div class="login-box">
                        <h2>❌ USER NOT FOUND</h2>
                        <p>User with ID ${userId} does not exist.</p>
                        <button onclick="window.location.reload()" style="margin-top:12px;background:linear-gradient(135deg,#6C4DFF,#8B5CFF);color:white;border:none;padding:8px 20px;border-radius:10px;cursor:pointer;">Try Again</button>
                    </div>
                </div>
            `;
        }
    }
    
    // ========================================
    // SHOW SELF CHAT ERROR
    // ========================================
    function showSelfChatError() {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            container.innerHTML = `
                <nav>
                    <h1>💬 KISAN CIRCLE</h1>
                    <button id="chat-widget-close" onclick="window.close()">&times;</button>
                </nav>
                <div id="login-prompt">
                    <div class="login-box">
                        <h2>😅 CAN'T CHAT WITH YOURSELF</h2>
                        <p>Please select a different user to chat with.</p>
                        <button onclick="window.location.href='/'" style="margin-top:12px;background:linear-gradient(135deg,#6C4DFF,#8B5CFF);color:white;border:none;padding:8px 20px;border-radius:10px;cursor:pointer;">Go Home</button>
                    </div>
                </div>
            `;
        }
    }
    
    // ========================================
    // UPDATE HEADER WITH RECEIVER NAME
    // ========================================
    function updateHeader(receiverName) {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            const headerTitle = container.querySelector('nav h1');
            if (headerTitle && receiverName) {
                headerTitle.textContent = `💬 Chat with ${receiverName}`;
            }
        }
    }
    
    // ========================================
    // APPEND MESSAGE TO UI
    // ========================================
    function appendMessage(data, position, messageContainer) {
        if (!messageContainer) {
            console.error('❌ No message container!');
            return;
        }
        
        // Prevent duplicates
        const existingMessages = messageContainer.querySelectorAll('.message');
        for (const existing of existingMessages) {
            if (existing.dataset.messageId && existing.dataset.messageId === String(data.id)) {
                console.log(`⚠️ Message ${data.id} already exists, skipping duplicate`);
                return;
            }
        }
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(position);
        if (data.id) {
            messageElement.dataset.messageId = data.id;
        }
        
        const time = data.created_at || data.timestamp 
            ? new Date(data.created_at || data.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        let messageContent = data.message || data.text || '';
        let senderName = data.sender_name || data.name || data.email || 'User';
        
        if (data.message_type === 'image') {
            messageContent = `<a href="${data.message}" target="_blank"><img src="${data.message}" class="message-image" /></a>`;
        } else if (data.message_type === 'audio') {
            messageContent = `<audio controls src="${data.message}"></audio>`;
        }
        
        messageElement.innerHTML = `
            <div class="message-body">${messageContent}</div>
            <div class="message-header">
                <span class="message-name">${position === 'left' ? senderName + ' · ' : ''}</span>
                <span class="message-info">${time}</span>
                ${position === 'right' ? `<span class="message-status" style="margin-left:6px;font-size:0.55rem;color:#888;">${data.is_read ? '✓✓ Read' : '✓ Sent'}</span>` : ''}
            </div>
        `;
        
        messageContainer.append(messageElement);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
    
    function appendSystemMessage(text, messageContainer) {
        if (!messageContainer) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'middle');
        messageElement.innerText = text;
        messageContainer.append(messageElement);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
    
    // ========================================
    // UPDATE ONLINE STATUS
    // ========================================
    function updateOnlineStatus(onlineUsers, elements, receiverId) {
        if (elements.userCountText) {
            elements.userCountText.textContent = onlineUsers.length > 0 ? `${onlineUsers.length} Online` : '0 Online';
        }
        if (elements.userCountDot) {
            elements.userCountDot.style.backgroundColor = onlineUsers.length > 0 ? '#32CD32' : '#ff4444';
        }
        
        // Check if receiver is online
        if (receiverId && elements.userCountText) {
            const isOnline = onlineUsers.includes(receiverId);
            elements.userCountText.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
            if (elements.userCountDot) {
                elements.userCountDot.style.backgroundColor = isOnline ? '#32CD32' : '#ff4444';
            }
        }
    }
    
    // ========================================
    // FETCH USER DETAILS
    // ========================================
    async function fetchUserDetails(userId) {
        try {
            const response = await fetch(`${SERVER_URL}/api/user/${userId}`);
            if (response.ok) {
                const user = await response.json();
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user details:', error);
            return null;
        }
    }
    
    // ========================================
    // LOAD CONVERSATION HISTORY
    // ========================================
    async function loadConversationHistory(userId, receiverId, messageContainer) {
        try {
            console.log(`📥 Loading conversation between ${userId} and ${receiverId}`);
            const response = await fetch(`${SERVER_URL}/api/chat/messages/${userId}/${receiverId}`);
            const data = await response.json();
            
            if (data.success && data.messages) {
                console.log(`📨 Received ${data.messages.length} messages`);
                messageContainer.innerHTML = '';
                if (data.messages.length === 0) {
                    appendSystemMessage('No messages yet. Start the conversation!', messageContainer);
                } else {
                    data.messages.forEach(msg => {
                        const isOwn = msg.sender_id === userId;
                        const position = isOwn ? 'right' : 'left';
                        appendMessage(msg, position, messageContainer);
                    });
                    
                    // Mark messages as read if this is the receiver
                    const unreadMessages = data.messages.filter(msg => 
                        msg.receiver_id === userId && !msg.is_read
                    );
                    if (unreadMessages.length > 0 && socket && socket.connected) {
                        console.log(`📨 Marking ${unreadMessages.length} messages as read`);
                        socket.emit('mark-read', {
                            user_id: userId,
                            other_user_id: receiverId
                        });
                    }
                }
                
                return data.messages;
            } else {
                messageContainer.innerHTML = '';
                appendSystemMessage('No messages yet. Start the conversation!', messageContainer);
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading conversation:', error);
            messageContainer.innerHTML = '';
            appendSystemMessage('Failed to load messages. Please refresh.', messageContainer);
            return [];
        }
    }
    
    // ========================================
    // INITIALIZE CHAT
    // ========================================
    async function initializeChat() {
        console.log('🚀 Initializing KISAN CIRCLE Chat...');
        
        // Get current user
        currentUser = getCurrentUser();
        
        // If no user, show login form
        if (!currentUser) {
            console.log('❌ No user logged in - showing login form');
            showLoginForm();
            return;
        }
        
        // Get receiver ID from URL
        currentReceiverId = getReceiverIdFromURL();
        
        console.log(`📥 Receiver ID from URL: ${currentReceiverId}`);
        
        if (!currentReceiverId) {
            console.log('❌ No receiver ID in URL');
            showNoReceiverPrompt();
            return;
        }
        
        // Prevent chatting with self
        if (currentUser.id === currentReceiverId) {
            console.log('❌ Cannot chat with self');
            showSelfChatError();
            return;
        }
        
        // Fetch receiver details
        const receiverDetails = await fetchUserDetails(currentReceiverId);
        if (!receiverDetails) {
            console.log('❌ Receiver not found');
            showUserNotFound(currentReceiverId);
            return;
        }
        
        console.log('✅ Starting chat...');
        console.log('👤 Current User:', currentUser);
        console.log('📥 Receiver:', receiverDetails);
        
        // Update header with receiver name
        updateHeader(receiverDetails.name || `User ${currentReceiverId}`);
        
        const elements = getElements();
        
        if (!elements.widget) {
            console.error('❌ Chat widget not found');
            return;
        }
        
        console.log(`🔗 Connecting to Socket.IO at ${SERVER_URL}`);
        
        // ========================================
        // CONNECT TO SOCKET.IO
        // ========================================
        socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });
        
        // ========================================
        // SOCKET EVENTS
        // ========================================
        socket.on('connect', () => {
            console.log('✅ Connected to chat server');
            console.log('🆔 Socket ID:', socket.id);
            isConnected = true;
            
            if (currentUser) {
                console.log('📤 Sending user data:', currentUser);
                socket.emit('user-connected', {
                    userId: currentUser.id,
                    email: currentUser.email,
                    name: currentUser.name
                });
            }
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            if (elements.userCountDot) elements.userCountDot.style.backgroundColor = '#ffaa00';
            if (elements.userCountText) elements.userCountText.textContent = 'Reconnecting...';
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server');
            isConnected = false;
            if (elements.userCountText) elements.userCountText.textContent = 'Disconnected';
            if (elements.userCountDot) elements.userCountDot.style.backgroundColor = '#ff4444';
        });
        
        // ========================================
        // USER CONNECTED CONFIRMATION
        // ========================================
        socket.on('user-connected-confirm', (data) => {
            console.log('✅ User connection confirmed:', data);
            // Load conversation history after connection
            loadConversationHistory(currentUser.id, currentReceiverId, elements.messageContainer);
        });
        
        // ========================================
        // ONLINE USERS LIST
        // ========================================
        socket.on('online-users', (onlineUsers) => {
            console.log('🟢 Online users:', onlineUsers);
            updateOnlineStatus(onlineUsers, elements, currentReceiverId);
        });
        
        // ========================================
        // NEW PRIVATE MESSAGE
        // ========================================
        socket.on('new-private-message', (data) => {
            console.log('📨📨📨 New private message received:', data);
            
            if (!data.message) {
                console.error('❌ Invalid message data:', data);
                return;
            }
            
            const msg = data.message;
            
            // Check if message is for this conversation
            if ((msg.sender_id === currentUser.id && msg.receiver_id === currentReceiverId) ||
                (msg.sender_id === currentReceiverId && msg.receiver_id === currentUser.id)) {
                const position = msg.sender_id === currentUser.id ? 'right' : 'left';
                appendMessage(msg, position, elements.messageContainer);
                
                // If we received a message, mark it as read
                if (msg.sender_id === currentReceiverId && !msg.is_read) {
                    socket.emit('mark-read', {
                        user_id: currentUser.id,
                        other_user_id: currentReceiverId
                    });
                }
            }
        });
        
        // ========================================
        // MESSAGE SENT CONFIRMATION
        // ========================================
        socket.on('message-sent', (data) => {
            console.log('✅ Message sent confirmation:', data);
        });
        
        // ========================================
        // MESSAGES READ CONFIRMATION
        // ========================================
        socket.on('messages-read', (data) => {
            console.log('📨 Messages read by:', data.by_user);
            // Update status indicators for messages
            const messages = elements.messageContainer.querySelectorAll('.message.right');
            messages.forEach(msg => {
                const statusSpan = msg.querySelector('.message-status');
                if (statusSpan) {
                    statusSpan.textContent = '✓✓ Read';
                }
            });
        });
        
        // ========================================
        // TYPING INDICATOR
        // ========================================
        socket.on('user-typing', (data) => {
            if (elements.typingIndicator) {
                if (data.user_id === currentReceiverId && data.isTyping) {
                    elements.typingIndicator.innerText = 'User is typing...';
                } else {
                    elements.typingIndicator.innerText = '';
                }
            }
        });
        
        // ========================================
        // SEND MESSAGE
        // ========================================
        if (elements.form) {
            const form = document.getElementById('send-container');
            const messageInput = document.getElementById('messageimp');
            const sendBtn = document.getElementById('send-btn');
            const recordBtn = document.getElementById('record-btn');
            
            if (!form || !messageInput) {
                console.error('❌ Form or input not found!');
                return;
            }
            
            // Show send button when typing
            messageInput.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    if (sendBtn) sendBtn.style.display = 'flex';
                    if (recordBtn) recordBtn.style.display = 'none';
                } else {
                    if (sendBtn) sendBtn.style.display = 'none';
                    if (recordBtn) recordBtn.style.display = 'flex';
                }
            });
            
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const message = messageInput.value.trim();
                
                if (!message) {
                    return false;
                }
                
                if (!socket || !socket.connected) {
                    alert('Please wait, connecting to chat...');
                    return false;
                }
                
                if (!currentUser || !currentReceiverId) {
                    return false;
                }
                
                // Create temporary message for UI
                const tempMessage = {
                    id: Date.now(),
                    sender_id: currentUser.id,
                    receiver_id: currentReceiverId,
                    message: message,
                    message_type: 'text',
                    is_read: false,
                    created_at: new Date().toISOString(),
                    sender_name: currentUser.name,
                    sender_email: currentUser.email
                };
                
                // Remove "No messages" system message if present
                const systemMessages = elements.messageContainer.querySelectorAll('.message.middle');
                systemMessages.forEach(el => {
                    if (el.innerText.includes('No messages yet')) {
                        el.remove();
                    }
                });
                
                // Display immediately for sender
                appendMessage(tempMessage, 'right', elements.messageContainer);
                
                // Send to server via Socket.IO
                socket.emit('send-private-message', {
                    sender_id: currentUser.id,
                    receiver_id: currentReceiverId,
                    message: message,
                    message_type: 'text'
                });
                
                // Clear input
                messageInput.value = '';
                messageInput.focus();
                if (sendBtn) sendBtn.style.display = 'none';
                if (recordBtn) recordBtn.style.display = 'flex';
                
                return false;
            });
            
            // Enter key handler
            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    form.dispatchEvent(new Event('submit'));
                    return false;
                }
            });
        }
        
        // ========================================
        // TYPING INDICATOR
        // ========================================
        if (elements.messageInput) {
            elements.messageInput.addEventListener('input', function() {
                if (!isTyping && socket && currentUser && currentReceiverId) { 
                    isTyping = true; 
                    socket.emit('typing', {
                        sender_id: currentUser.id,
                        receiver_id: currentReceiverId
                    });
                }
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => { 
                    isTyping = false; 
                    if (socket && currentUser && currentReceiverId) {
                        socket.emit('stop-typing', {
                            sender_id: currentUser.id,
                            receiver_id: currentReceiverId
                        });
                    }
                }, 2000);
            });
        }
        
        // ========================================
        // IMAGE UPLOAD
        // ========================================
        if (elements.attachFileBtn && elements.imageInput) {
            elements.attachFileBtn.addEventListener('click', () => { 
                elements.imageInput.click(); 
            });
            
            elements.imageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file || !currentUser || !currentReceiverId) return;
                
                const formData = new FormData();
                formData.append('image', file);
                
                try {
                    const response = await fetch(`${SERVER_URL}/upload/image`, { 
                        method: 'POST', 
                        body: formData 
                    });
                    const data = await response.json();
                    
                    if (data.filePath) {
                        const tempMessage = {
                            id: Date.now(),
                            sender_id: currentUser.id,
                            receiver_id: currentReceiverId,
                            message: data.filePath,
                            message_type: 'image',
                            is_read: false,
                            created_at: new Date().toISOString(),
                            sender_name: currentUser.name,
                            sender_email: currentUser.email
                        };
                        
                        const systemMessages = elements.messageContainer.querySelectorAll('.message.middle');
                        systemMessages.forEach(el => {
                            if (el.innerText.includes('No messages yet')) {
                                el.remove();
                            }
                        });
                        
                        appendMessage(tempMessage, 'right', elements.messageContainer);
                        
                        socket.emit('send-private-message', {
                            sender_id: currentUser.id,
                            receiver_id: currentReceiverId,
                            message: data.filePath,
                            message_type: 'image'
                        });
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    alert('Failed to upload image');
                }
                e.target.value = null;
            });
        }
        
        // ========================================
        // AUDIO RECORDING
        // ========================================
        if (elements.recordBtn) {
            elements.recordBtn.addEventListener('mousedown', () => {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { 
                    alert('Browser not supported'); 
                    return; 
                }
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        isRecording = true; 
                        audioChunks = []; 
                        mediaRecorder = new MediaRecorder(stream); 
                        mediaRecorder.start(); 
                        elements.recordBtn.classList.add('recording');
                        mediaRecorder.addEventListener("dataavailable", event => { 
                            audioChunks.push(event.data); 
                        });
                    })
                    .catch(err => {
                        console.error('Microphone error:', err);
                        alert('Could not access microphone');
                    });
            });
            
            elements.recordBtn.addEventListener('mouseup', async () => {
                if (!isRecording || !mediaRecorder) return;
                isRecording = false; 
                mediaRecorder.stop(); 
                elements.recordBtn.classList.remove('recording');
                
                mediaRecorder.addEventListener("stop", async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('audio', audioBlob, `audio-${Date.now()}.webm`);
                    
                    try {
                        const response = await fetch(`${SERVER_URL}/upload/audio`, { 
                            method: 'POST', 
                            body: formData 
                        });
                        const data = await response.json();
                        
                        if (data.filePath) {
                            const tempMessage = {
                                id: Date.now(),
                                sender_id: currentUser.id,
                                receiver_id: currentReceiverId,
                                message: data.filePath,
                                message_type: 'audio',
                                is_read: false,
                                created_at: new Date().toISOString(),
                                sender_name: currentUser.name,
                                sender_email: currentUser.email
                            };
                            
                            const systemMessages = elements.messageContainer.querySelectorAll('.message.middle');
                            systemMessages.forEach(el => {
                                if (el.innerText.includes('No messages yet')) {
                                    el.remove();
                                }
                            });
                            
                            appendMessage(tempMessage, 'right', elements.messageContainer);
                            
                            socket.emit('send-private-message', {
                                sender_id: currentUser.id,
                                receiver_id: currentReceiverId,
                                message: data.filePath,
                                message_type: 'audio'
                            });
                        }
                    } catch (error) {
                        console.error('Audio upload error:', error);
                        alert('Failed to upload audio');
                    }
                });
            });
        }
        
        console.log('✅ KISAN CIRCLE Chat initialization complete');
    }
    
    // ========================================
    // START
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChat);
    } else {
        initializeChat();
    }
})();