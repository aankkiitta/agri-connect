(function() {
    console.log('🔄 KISAN CIRCLE Group Chat loaded...');
    console.log('📍 Current URL:', window.location.href);
    
    const SERVER_URL = window.location.origin;
    console.log('🔗 Server URL:', SERVER_URL);
    
    let socket = null;
    let currentUser = null;
    let isConnected = false;
    let isTyping = false;
    let typingTimer;
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let messageHistory = [];
    
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
                        <p>Login to join the group chat</p>
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
    // UPDATE HEADER
    // ========================================
    function updateHeader(userName) {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            const headerTitle = container.querySelector('nav h1');
            if (headerTitle && userName) {
                headerTitle.textContent = `💬 KISAN CIRCLE`;
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
    // UPDATE ONLINE COUNT
    // ========================================
    function updateOnlineCount(count, elements) {
        if (elements.userCountText) {
            elements.userCountText.textContent = count > 0 ? `${count} Online` : '0 Online';
        }
        if (elements.userCountDot) {
            elements.userCountDot.style.backgroundColor = count > 0 ? '#32CD32' : '#ff4444';
        }
    }
    
    // ========================================
    // LOAD CHAT HISTORY
    // ========================================
    async function loadChatHistory(messageContainer) {
        try {
            console.log('📥 Loading chat history...');
            const response = await fetch(`${SERVER_URL}/api/chat/messages`);
            const data = await response.json();
            
            if (data.success && data.messages) {
                console.log(`📨 Received ${data.messages.length} messages`);
                messageContainer.innerHTML = '';
                if (data.messages.length === 0) {
                    appendSystemMessage('No messages yet. Start the conversation!', messageContainer);
                } else {
                    data.messages.forEach(msg => {
                        const isOwn = msg.sender_id === currentUser.id;
                        const position = isOwn ? 'right' : 'left';
                        appendMessage(msg, position, messageContainer);
                    });
                }
                
                return data.messages;
            } else {
                messageContainer.innerHTML = '';
                appendSystemMessage('No messages yet. Start the conversation!', messageContainer);
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading chat history:', error);
            messageContainer.innerHTML = '';
            appendSystemMessage('Failed to load messages. Please refresh.', messageContainer);
            return [];
        }
    }
    
    // ========================================
    // INITIALIZE CHAT
    // ========================================
    async function initializeChat() {
        console.log('🚀 Initializing KISAN CIRCLE Group Chat...');
        
        // Get current user
        currentUser = getCurrentUser();
        
        // If no user, show login form
        if (!currentUser) {
            console.log('❌ No user logged in - showing login form');
            showLoginForm();
            return;
        }
        
        console.log('✅ User logged in:', currentUser);
        
        // Update header
        updateHeader(currentUser.name);
        
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
            // Load chat history after connection
            loadChatHistory(elements.messageContainer);
        });
        
        // ========================================
        // ONLINE USERS COUNT
        // ========================================
        socket.on('online-users', (onlineUsers) => {
            console.log('🟢 Online users:', onlineUsers);
            const count = onlineUsers ? onlineUsers.length : 0;
            updateOnlineCount(count, elements);
        });
        
        // ========================================
        // USER JOINED/LEFT - GROUP CHAT
        // ========================================
        socket.on('user-joined', (data) => {
            console.log('👤 User joined:', data);
            appendSystemMessage(data.message || `${data.name} joined the chat`, elements.messageContainer);
            // Update online count will come from online-users event
        });
        
        socket.on('user-left', (data) => {
            console.log('👤 User left:', data);
            appendSystemMessage(data.message || `${data.name} left the chat`, elements.messageContainer);
            // Update online count will come from online-users event
        });
        
        // ========================================
        // NEW GROUP MESSAGE
        // ========================================
        socket.on('receive-message', (data) => {
            console.log('📨📨📨 New group message received:', data);
            
            if (!data.message) {
                console.error('❌ Invalid message data:', data);
                return;
            }
            
            const position = data.sender_id === currentUser.id ? 'right' : 'left';
            appendMessage(data, position, elements.messageContainer);
        });
        
        // ========================================
        // TYPING INDICATOR
        // ========================================
        socket.on('user-typing', (data) => {
            if (elements.typingIndicator) {
                if (data.isTyping && data.name !== currentUser.name) {
                    elements.typingIndicator.innerText = `${data.name} is typing...`;
                } else {
                    elements.typingIndicator.innerText = '';
                }
            }
        });
        
        // ========================================
        // SEND MESSAGE - GROUP CHAT
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
                
                if (!currentUser) {
                    alert('Please login first');
                    return false;
                }
                
                // Create temporary message for UI
                const tempMessage = {
                    id: Date.now(),
                    sender_id: currentUser.id,
                    receiver_id: null, // Group chat
                    message: message,
                    message_type: 'text',
                    created_at: new Date().toISOString(),
                    sender_name: currentUser.name,
                    sender_email: currentUser.email,
                    name: currentUser.name
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
                socket.emit('send-message', {
                    sender_id: currentUser.id,
                    sender_name: currentUser.name,
                    sender_email: currentUser.email,
                    message: message,
                    message_type: 'text'
                });
                console.log('📤 Message emitted to server');
                
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
                if (!isTyping && socket && currentUser) { 
                    isTyping = true; 
                    socket.emit('typing', {
                        userId: currentUser.id,
                        name: currentUser.name
                    });
                }
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => { 
                    isTyping = false; 
                    if (socket && currentUser) {
                        socket.emit('stop-typing', {
                            userId: currentUser.id,
                            name: currentUser.name
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
                if (!file || !currentUser) return;
                
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
                            receiver_id: null,
                            message: data.filePath,
                            message_type: 'image',
                            created_at: new Date().toISOString(),
                            sender_name: currentUser.name,
                            sender_email: currentUser.email,
                            name: currentUser.name
                        };
                        
                        const systemMessages = elements.messageContainer.querySelectorAll('.message.middle');
                        systemMessages.forEach(el => {
                            if (el.innerText.includes('No messages yet')) {
                                el.remove();
                            }
                        });
                        
                        appendMessage(tempMessage, 'right', elements.messageContainer);
                        
                        socket.emit('send-message', {
                            sender_id: currentUser.id,
                            sender_name: currentUser.name,
                            sender_email: currentUser.email,
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
                                receiver_id: null,
                                message: data.filePath,
                                message_type: 'audio',
                                created_at: new Date().toISOString(),
                                sender_name: currentUser.name,
                                sender_email: currentUser.email,
                                name: currentUser.name
                            };
                            
                            const systemMessages = elements.messageContainer.querySelectorAll('.message.middle');
                            systemMessages.forEach(el => {
                                if (el.innerText.includes('No messages yet')) {
                                    el.remove();
                                }
                            });
                            
                            appendMessage(tempMessage, 'right', elements.messageContainer);
                            
                            socket.emit('send-message', {
                                sender_id: currentUser.id,
                                sender_name: currentUser.name,
                                sender_email: currentUser.email,
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
        
        console.log('✅ KISAN CIRCLE Group Chat initialization complete');
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