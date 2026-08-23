(function() {
    console.log('🔄 Chat.js loaded...');
    
    // ========================================
    // CHECK IF WE'RE ON FULL PAGE OR WIDGET
    // ========================================
    const isFullPage = document.getElementById('chat-widget-container') !== null;
    
    // ========================================
    // AUTO-DETECT SERVER URL
    // ========================================
    const SERVER_URL = window.location.origin;
    
    let socket = null;
    let currentUser = null;
    let isConnected = false;
    
    // ========================================
    // GET USER FROM localStorage
    // ========================================
    function getCurrentUser() {
        try {
            const keys = ['agriUser', 'user', 'userData', 'authUser'];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const user = JSON.parse(data);
                        console.log(`✅ Found user in localStorage key: ${key}`, user);
                        
                        const userId = user.id || user.user_id || user.userId || user._id || null;
                        const email = user.email || null;
                        const name = user.name || user.username || 'User';
                        
                        if (userId || email) {
                            console.log(`✅ User: ${name} (${email})`);
                            return { id: userId, email, name };
                        }
                    } catch (e) {}
                }
            }
            
            console.warn('⚠️ No user data found');
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    // Get current user
    currentUser = getCurrentUser();
    
    // ========================================
    // START CHAT
    // ========================================
    if (currentUser) {
        console.log('✅ Starting group chat');
        
        if (isFullPage) {
            // Full page - use existing container
            initializeChatFullPage();
        } else {
            // Widget mode - create launcher and widget
            createLauncherAndWidget();
        }
    } else {
        console.log('❌ No user logged in');
        if (!isFullPage) {
            createLoginPromptWidget();
        } else {
            // Show login prompt on full page
            showLoginPromptFullPage();
        }
    }

    // ========================================
    // CREATE LAUNCHER AND WIDGET (Widget Mode)
    // ========================================
    function createLauncherAndWidget() {
        console.log('🔄 Creating chat launcher and widget...');
        
        // Create launcher
        const launcher = document.createElement('div');
        launcher.id = 'chat-launcher';
        launcher.innerHTML = `
            <i class="fa-solid fa-message"></i>
            <span id="chat-unread-badge"></span>
        `;
        document.body.appendChild(launcher);

        // Create widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'chat-widget-container';
        widgetContainer.innerHTML = `
            <nav>
                <h1>💬 KISAN CIRCLE GROUP</h1>
                <div id="user-count-container">
                    <span id="user-count-dot"></span>
                    <span id="user-count-text">Connecting...</span>
                </div>
                <button id="chat-widget-close">&times;</button>
            </nav>
            <div class="container active"></div>
            <div id="typing-indicator"></div>
            <div class="send active">
                <input type="file" id="image-input" accept="image/*" style="display: none;">
                <form action="#" id="send-container">
                    <button type="button" class="btn-icon" id="attach-file-btn">
                        <i class="fa-solid fa-paperclip"></i>
                    </button>
                    <input type="text" name="messageimp" id="messageimp" placeholder="Type a message..." autocomplete="off">
                    <button class="btn" type="submit" id="send-btn" style="display: none;">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                    <button type="button" class="btn" id="record-btn">
                        <i class="fa-solid fa-microphone"></i>
                    </button>
                </form>
            </div>`;
        
        document.body.appendChild(widgetContainer);
        
        // Add click events
        launcher.addEventListener('click', () => {
            widgetContainer.classList.add('active');
            launcher.style.display = 'none';
        });
        
        const closeBtn = widgetContainer.querySelector('#chat-widget-close');
        closeBtn.addEventListener('click', () => {
            widgetContainer.classList.remove('active');
            launcher.style.display = 'flex';
        });
        
        // Initialize chat
        initializeChat(widgetContainer, launcher);
    }

    // ========================================
    // INITIALIZE FULL PAGE CHAT
    // ========================================
    function initializeChatFullPage() {
        console.log('🔄 Initializing full page chat...');
        const widgetContainer = document.getElementById('chat-widget-container');
        const launcher = null; // No launcher for full page
        initializeChat(widgetContainer, launcher);
    }

    // ========================================
    // SHOW LOGIN PROMPT ON FULL PAGE
    // ========================================
    function showLoginPromptFullPage() {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            container.innerHTML = `
                <nav>
                    <h1>🔐 KISAN CIRCLE</h1>
                </nav>
                <div style="flex:1; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.1); backdrop-filter:blur(10px); padding:20px;">
                    <div style="background:white; padding:40px; border-radius:20px; text-align:center; max-width:400px;">
                        <h2>🔐 LOGIN REQUIRED</h2>
                        <p style="color:#666; margin:15px 0;">Please login to access Kisan Circle chat.</p>
                        <a href="/login" style="background:linear-gradient(135deg, #6C4DFF, #8B5CFF); color:white; padding:12px 30px; border-radius:25px; text-decoration:none; font-weight:600; display:inline-block;">Go to Login</a>
                    </div>
                </div>
            `;
        }
    }

    // ========================================
    // CREATE LOGIN PROMPT WIDGET
    // ========================================
    function createLoginPromptWidget() {
        const launcher = document.createElement('div');
        launcher.id = 'chat-launcher';
        launcher.innerHTML = `<i class="fa-solid fa-message"></i><span id="chat-unread-badge"></span>`;
        document.body.appendChild(launcher);

        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'chat-widget-container';
        widgetContainer.innerHTML = `
            <nav>
                <h1>🔐 LOGIN REQUIRED</h1>
                <button id="chat-widget-close-prompt">&times;</button>
            </nav>
            <div id="join-modal">
                <div id="join-box">
                    <h2>🔐 LOGIN REQUIRED</h2>
                    <p>Please login to access Kisan Circle chat.</p>
                    <div style="margin-top: 20px;">
                        <a href="/login" style="color: #6C4DFF; text-decoration: underline; font-weight: 600;">Go to Login</a>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(widgetContainer);
        
        const closeBtn = widgetContainer.querySelector('#chat-widget-close-prompt');
        launcher.addEventListener('click', () => { 
            widgetContainer.classList.add('active'); 
            launcher.style.display = 'none'; 
        });
        closeBtn.addEventListener('click', () => { 
            widgetContainer.classList.remove('active'); 
            launcher.style.display = 'flex'; 
        });
    }

    // ========================================
    // MAIN CHAT LOGIC
    // ========================================
    function initializeChat(widget, launcher) {
        console.log('🔄 Initializing chat...');
        console.log('👤 User:', currentUser);
        console.log(`🔗 Server URL: ${SERVER_URL}`);
        
        // Connect to Socket.IO
        socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        const form = widget.querySelector('#send-container');
        const messageInput = widget.querySelector('#messageimp');
        const messageContainer = widget.querySelector('.container');
        const closeBtn = widget.querySelector('#chat-widget-close') || widget.querySelector('#chat-widget-close-prompt');
        const unreadBadge = launcher ? launcher.querySelector('#chat-unread-badge') : null;
        const userCountText = widget.querySelector('#user-count-text');
        const userCountDot = widget.querySelector('#user-count-dot');
        const attachFileBtn = widget.querySelector('#attach-file-btn');
        const imageInput = widget.querySelector('#image-input');
        const sendBtn = widget.querySelector('#send-btn');
        const recordBtn = widget.querySelector('#record-btn');
        const typingIndicator = widget.querySelector('#typing-indicator');

        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        let isTyping = false;
        let typingTimer;
        let unreadCount = 0;

        // ========================================
        // SOCKET EVENTS
        // ========================================
        socket.on('connect', () => {
            console.log('✅ Connected to chat server');
            console.log('🆔 Socket ID:', socket.id);
            isConnected = true;
            if (userCountDot) userCountDot.style.backgroundColor = '#32CD32';
            if (userCountText) userCountText.textContent = 'Online';
            
            if (currentUser) {
                console.log('📤 Sending user data:', currentUser);
                socket.emit('user-connected', currentUser);
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server');
            isConnected = false;
            if (userCountDot) userCountDot.style.backgroundColor = '#ff4444';
            if (userCountText) userCountText.textContent = 'Offline';
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            if (userCountDot) userCountDot.style.backgroundColor = '#ffaa00';
            if (userCountText) userCountText.textContent = 'Reconnecting...';
        });

        // Chat history
        socket.on('chat-history', (messages) => {
            console.log(`📨 Received ${messages ? messages.length : 0} messages`);
            if (messageContainer) {
                messageContainer.innerHTML = '';
                if (messages && messages.length > 0) {
                    messages.forEach(msg => {
                        const isOwn = msg.email === currentUser.email || msg.userId === currentUser.id;
                        const position = isOwn ? 'right' : 'left';
                        appendMessage(msg, position);
                    });
                }
            }
        });

        // Online users
        socket.on('online-users', (users) => {
            console.log('🟢 Online users:', users);
            const count = users ? users.length : 0;
            if (userCountText) {
                userCountText.textContent = count > 0 ? `${count} Online` : '0 Online';
            }
            if (userCountDot) {
                userCountDot.style.backgroundColor = count > 0 ? '#32CD32' : '#ff4444';
            }
        });

        // User joined
        socket.on('user-joined', (data) => {
            console.log('👤 User joined:', data);
            appendSystemMessage(data.message);
        });

        // User left
        socket.on('user-left', (data) => {
            console.log('👤 User left:', data);
            appendSystemMessage(data.message);
        });

        // Receive message
        socket.on('receive-message', (data) => {
            console.log('📨📨📨 MESSAGE RECEIVED:', data);
            
            const isOwn = data.email === currentUser.email || data.userId === currentUser.id;
            const position = isOwn ? 'right' : 'left';
            appendMessage(data, position);
            
            if (unreadBadge && !widget.classList.contains('active')) {
                unreadCount++;
                unreadBadge.innerText = unreadCount;
                unreadBadge.style.display = 'flex';
            }
        });

        // Typing indicator
        socket.on('user-typing', (data) => {
            if (typingIndicator) {
                if (data.isTyping) {
                    typingIndicator.innerText = `${data.name} is typing...`;
                } else {
                    typingIndicator.innerText = '';
                }
            }
        });

        // ========================================
        // APPEND MESSAGE
        // ========================================
        function appendMessage(data, position) {
            if (!messageContainer) return;
            
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.classList.add(position);

            const time = data.timestamp 
                ? new Date(data.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

            let messageContent = data.message || data.text || '';
            let senderName = data.name || data.email || 'User';
            
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

        function appendSystemMessage(text) {
            if (!messageContainer) return;
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', 'middle');
            messageElement.innerText = text;
            messageContainer.append(messageElement);
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }

        // ========================================
        // SEND MESSAGE
        // ========================================
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const message = messageInput ? messageInput.value.trim() : '';
                
                if (!message || !socket || !currentUser) {
                    console.error('❌ Cannot send message');
                    return;
                }
                
                const messageData = {
                    message: message,
                    message_type: 'text'
                };
                
                console.log('📤 Sending message:', messageData);
                
                // Display immediately for sender
                const displayData = {
                    ...messageData,
                    name: currentUser.name,
                    email: currentUser.email,
                    userId: currentUser.id,
                    timestamp: new Date().toISOString()
                };
                appendMessage(displayData, 'right');
                
                // Send to server
                socket.emit('send-message', messageData);
                
                if (messageInput) {
                    messageInput.value = '';
                }
                socket.emit('stop-typing');
                isTyping = false;
                if (recordBtn) recordBtn.style.display = 'flex';
                if (sendBtn) sendBtn.style.display = 'none';
            });
        }

        // ========================================
        // TYPING
        // ========================================
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                if (!isTyping && socket && currentUser) { 
                    isTyping = true; 
                    socket.emit('typing');
                }
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => { 
                    isTyping = false; 
                    if (socket) {
                        socket.emit('stop-typing');
                    }
                }, 2000);
                
                if (messageInput.value.trim() !== '') { 
                    if (recordBtn) recordBtn.style.display = 'none'; 
                    if (sendBtn) sendBtn.style.display = 'flex'; 
                } else { 
                    if (recordBtn) recordBtn.style.display = 'flex'; 
                    if (sendBtn) sendBtn.style.display = 'none'; 
                }
            });
        }

        // ========================================
        // IMAGE UPLOAD
        // ========================================
        if (attachFileBtn && imageInput) {
            attachFileBtn.addEventListener('click', () => { imageInput.click(); });
            
            imageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('image', file);
                
                try {
                    const response = await fetch(`${SERVER_URL}/upload/image`, { 
                        method: 'POST', 
                        body: formData 
                    });
                    const data = await response.json();
                    
                    if (data.filePath) {
                        const displayData = {
                            message: data.filePath,
                            message_type: 'image',
                            name: currentUser.name,
                            email: currentUser.email,
                            userId: currentUser.id,
                            timestamp: new Date().toISOString()
                        };
                        appendMessage(displayData, 'right');
                        socket.emit('send-image', { filePath: data.filePath });
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
        if (recordBtn) {
            recordBtn.addEventListener('mousedown', () => {
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
                        recordBtn.classList.add('recording');
                        mediaRecorder.addEventListener("dataavailable", event => { 
                            audioChunks.push(event.data); 
                        });
                    })
                    .catch(err => {
                        console.error('Microphone error:', err);
                        alert('Could not access microphone');
                    });
            });

            recordBtn.addEventListener('mouseup', async () => {
                if (!isRecording || !mediaRecorder) return;
                isRecording = false; 
                mediaRecorder.stop(); 
                recordBtn.classList.remove('recording');
                
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
                            const displayData = {
                                message: data.filePath,
                                message_type: 'audio',
                                name: currentUser.name,
                                email: currentUser.email,
                                userId: currentUser.id,
                                timestamp: new Date().toISOString()
                            };
                            appendMessage(displayData, 'right');
                            socket.emit('send-audio', { filePath: data.filePath });
                        }
                    } catch (error) {
                        console.error('Audio upload error:', error);
                        alert('Failed to upload audio');
                    }
                });
            });
        }

        // ========================================
        // LAUNCHER CLICK (for widget mode)
        // ========================================
        if (launcher) {
            launcher.addEventListener('click', () => { 
                widget.classList.add('active'); 
                launcher.style.display = 'none'; 
                unreadCount = 0; 
                if (unreadBadge) {
                    unreadBadge.style.display = 'none'; 
                }
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => { 
                if (launcher) {
                    widget.classList.remove('active'); 
                    launcher.style.display = 'flex'; 
                }
            });
        }
    }
})();