(function() {
    console.log('🔄 Chat.js loaded...');
    console.log('📍 Current URL:', window.location.href);
    
    const SERVER_URL = window.location.origin;
    console.log('🔗 Server URL:', SERVER_URL);
    
    let socket = null;
    let currentUser = null;
    let currentReceiverId = null;
    let currentRoomId = null;
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
                console.log(`📦 Checking key "${key}":`, data ? 'Found' : 'Not found');
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
                    } catch (e) {
                        console.warn(`⚠️ Failed to parse data from key: ${key}`);
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
    // GET RECEIVER ID FROM URL
    // ========================================
    function getReceiverIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('userId') || params.get('receiverId') || params.get('id');
        console.log('📥 Receiver ID from URL:', id);
        return id ? parseInt(id) : null;
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
            typingIndicator: document.getElementById('typing-indicator')
        };
        
        console.log('📋 DOM Elements found:', {
            widget: !!elements.widget,
            form: !!elements.form,
            messageInput: !!elements.messageInput,
            messageContainer: !!elements.messageContainer
        });
        
        if (!elements.messageContainer) {
            elements.messageContainer = document.querySelector('.container');
            console.log('📋 Using fallback .container');
        }
        
        return elements;
    }

    // ========================================
    // SHOW LOGIN PROMPT
    // ========================================
    function showLoginPrompt() {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            container.innerHTML = `
                <nav>
                    <h1>🔐 KISAN CIRCLE</h1>
                </nav>
                <div id="login-prompt">
                    <div class="login-box">
                        <h2>🔐 LOGIN REQUIRED</h2>
                        <p>Please login to access Kisan Circle chat.</p>
                        <a href="/login">Go to Login</a>
                    </div>
                </div>
            `;
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
                </nav>
                <div id="login-prompt">
                    <div class="login-box">
                        <h2>👤 SELECT A USER</h2>
                        <p>Use: <code>/chat?userId=2</code></p>
                    </div>
                </div>
            `;
        }
    }

    // ========================================
    // APPEND MESSAGE
    // ========================================
    function appendMessage(data, position, messageContainer) {
        if (!messageContainer) {
            console.error('❌ No message container!');
            return;
        }
        
        console.log(`📝 Appending message: ${data.message} (${position})`);
        
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
        console.log('✅ Message appended to UI');
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
    // UPDATE USER COUNT
    // ========================================
    function updateUserCount(count, elements) {
        if (elements.userCountText) {
            elements.userCountText.textContent = count > 0 ? `${count} Online` : '0 Online';
        }
        if (elements.userCountDot) {
            elements.userCountDot.style.backgroundColor = count > 0 ? '#32CD32' : '#ff4444';
        }
        console.log(`👥 User count updated: ${count} online`);
    }

    // ========================================
    // UPDATE RECEIVER PRESENCE
    // ========================================
    function updateReceiverPresence(online, elements) {
        if (elements.userCountText) {
            elements.userCountText.textContent = online ? '🟢 Online' : '🔴 Offline';
        }
        if (elements.userCountDot) {
            elements.userCountDot.style.backgroundColor = online ? '#32CD32' : '#ff4444';
        }
        console.log(`📡 Receiver presence: ${online ? 'Online' : 'Offline'}`);
    }

    // ========================================
    // INITIALIZE CHAT
    // ========================================
    function initializeChat() {
        console.log('🚀 Initializing chat...');
        
        currentUser = getCurrentUser();
        
        if (!currentUser) {
            console.log('❌ No user logged in');
            showLoginPrompt();
            return;
        }
        
        currentReceiverId = getReceiverIdFromURL();
        
        if (!currentReceiverId) {
            console.log('❌ No receiver ID in URL');
            showNoReceiverPrompt();
            return;
        }
        
        console.log('✅ Starting chat...');
        console.log('👤 User:', currentUser);
        console.log('📥 Receiver:', currentReceiverId);
        
        const elements = getElements();
        
        if (!elements.widget) {
            console.error('❌ Chat widget not found');
            return;
        }

        console.log(`🔗 Server URL: ${SERVER_URL}`);

        // ========================================
        // CONNECT TO SOCKET.IO
        // ========================================
        console.log('📡 Connecting to Socket.IO...');
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
            
            updateReceiverPresence(false, elements);
            
            if (currentUser) {
                console.log('📤 Sending user data:', currentUser);
                socket.emit('user-connected', {
                    userId: currentUser.id,
                    email: currentUser.email,
                    name: currentUser.name
                });
            }
            
            // Join conversation
            socket.emit('join-conversation', {
                userId: currentUser.id,
                receiverId: currentReceiverId
            });
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server');
            isConnected = false;
            updateReceiverPresence(false, elements);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            if (elements.userCountDot) elements.userCountDot.style.backgroundColor = '#ffaa00';
            if (elements.userCountText) elements.userCountText.textContent = 'Reconnecting...';
        });

        // ========================================
        // RECEIVE CHAT HISTORY
        // ========================================
        socket.on('chat-history', (messages) => {
            console.log(`📨 Received ${messages ? messages.length : 0} messages`);
            if (elements.messageContainer) {
                elements.messageContainer.innerHTML = '';
                if (messages && messages.length > 0) {
                    messages.forEach(msg => {
                        const isOwn = msg.sender_id === currentUser.id;
                        const position = isOwn ? 'right' : 'left';
                        appendMessage(msg, position, elements.messageContainer);
                    });
                }
            }
        });

        // ========================================
        // RECEIVER PRESENCE
        // ========================================
        socket.on('receiver-presence', (data) => {
            console.log('📡 Receiver presence update:', data);
            if (data.userId === currentReceiverId) {
                updateReceiverPresence(data.online, elements);
            }
        });

        // ========================================
        // RECEIVE MESSAGE (REAL-TIME)
        // ========================================
        socket.on('receive-message', (data) => {
            console.log('📨📨📨 MESSAGE RECEIVED:', data);
            console.log('📨 From:', data.name, 'Message:', data.message);
            
            // Check if message is for this conversation
            if ((data.sender_id === currentUser.id && data.receiver_id === currentReceiverId) ||
                (data.sender_id === currentReceiverId && data.receiver_id === currentUser.id)) {
                const position = data.sender_id === currentUser.id ? 'right' : 'left';
                appendMessage(data, position, elements.messageContainer);
            }
        });

        // ========================================
        // ONLINE USERS
        // ========================================
        socket.on('online-users', (users) => {
            console.log('🟢 Online users:', users);
            const count = users ? users.length : 0;
            
            // Check if receiver is online
            const receiverOnline = users && users.some(u => u.id === currentReceiverId);
            if (receiverOnline !== undefined) {
                updateReceiverPresence(receiverOnline, elements);
            }
            
            if (elements.userCountText) {
                elements.userCountText.textContent = count > 0 ? `${count} Online` : '0 Online';
            }
        });

        // ========================================
        // USER JOINED/LEFT
        // ========================================
        socket.on('user-joined', (data) => {
            console.log('👤 User joined:', data);
            if (data.userId === currentReceiverId) {
                updateReceiverPresence(true, elements);
            }
            appendSystemMessage(data.message, elements.messageContainer);
        });

        socket.on('user-left', (data) => {
            console.log('👤 User left:', data);
            if (data.userId === currentReceiverId) {
                updateReceiverPresence(false, elements);
            }
            appendSystemMessage(data.message, elements.messageContainer);
        });

        // ========================================
        // CONVERSATION JOINED
        // ========================================
        socket.on('conversation-joined', (data) => {
            console.log('✅ Conversation joined:', data);
            currentRoomId = data.roomId;
        });

        // ========================================
        // TYPING INDICATOR
        // ========================================
        socket.on('user-typing', (data) => {
            if (elements.typingIndicator) {
                if (data.userId === currentReceiverId && data.isTyping) {
                    elements.typingIndicator.innerText = `${data.name || 'User'} is typing...`;
                } else {
                    elements.typingIndicator.innerText = '';
                }
            }
        });

        // ========================================
        // SEND MESSAGE
        // ========================================
        if (elements.form) {
            console.log('📋 Setting up form handler...');
            
            const form = document.getElementById('send-container');
            const messageInput = document.getElementById('messageimp');
            const sendBtn = document.getElementById('send-btn');
            const recordBtn = document.getElementById('record-btn');
            
            if (!form) {
                console.error('❌ Form not found!');
                return;
            }
            
            if (!messageInput) {
                console.error('❌ Message input not found!');
                return;
            }
            
            console.log('✅ Form and input found');
            
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const message = messageInput.value.trim();
                console.log('📤 Sending message:', message);
                
                if (!message) {
                    console.log('❌ Empty message');
                    return false;
                }
                
                if (!socket || !socket.connected) {
                    console.log('❌ Socket not connected');
                    alert('Please wait, connecting to chat...');
                    return false;
                }
                
                if (!currentUser || !currentReceiverId) {
                    console.log('❌ Missing user IDs');
                    return false;
                }
                
                const messageData = {
                    sender_id: currentUser.id,
                    receiver_id: currentReceiverId,
                    message: message,
                    message_type: 'text'
                };
                
                // Display immediately for sender
                const displayData = {
                    sender_id: currentUser.id,
                    receiver_id: currentReceiverId,
                    name: currentUser.name,
                    email: currentUser.email,
                    message: message,
                    message_type: 'text',
                    timestamp: new Date().toISOString()
                };
                appendMessage(displayData, 'right', elements.messageContainer);
                
                // Send to server
                socket.emit('send-message', messageData);
                console.log('📤 Message emitted to server');
                
                // Clear input
                messageInput.value = '';
                messageInput.focus();
                
                if (recordBtn) recordBtn.style.display = 'flex';
                if (sendBtn) sendBtn.style.display = 'none';
                
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
            
            // Show/hide send button
            messageInput.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    if (sendBtn) sendBtn.style.display = 'flex';
                    if (recordBtn) recordBtn.style.display = 'none';
                } else {
                    if (sendBtn) sendBtn.style.display = 'none';
                    if (recordBtn) recordBtn.style.display = 'flex';
                }
            });
        }

        // ========================================
        // TYPING
        // ========================================
        if (elements.messageInput) {
            elements.messageInput.addEventListener('input', function() {
                if (!isTyping && socket && currentUser && currentReceiverId) { 
                    isTyping = true; 
                    socket.emit('typing', {
                        userId: currentUser.id,
                        receiverId: currentReceiverId
                    });
                }
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => { 
                    isTyping = false; 
                    if (socket && currentUser && currentReceiverId) {
                        socket.emit('stop-typing', {
                            userId: currentUser.id,
                            receiverId: currentReceiverId
                        });
                    }
                }, 2000);
            });
        }

        // ========================================
        // IMAGE UPLOAD
        // ========================================
        if (elements.attachFileBtn && elements.imageInput) {
            elements.attachFileBtn.addEventListener('click', () => { elements.imageInput.click(); });
            
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
                        const displayData = {
                            sender_id: currentUser.id,
                            receiver_id: currentReceiverId,
                            name: currentUser.name,
                            email: currentUser.email,
                            message: data.filePath,
                            message_type: 'image',
                            timestamp: new Date().toISOString()
                        };
                        appendMessage(displayData, 'right', elements.messageContainer);
                        socket.emit('send-image', {
                            sender_id: currentUser.id,
                            receiver_id: currentReceiverId,
                            filePath: data.filePath
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
                            const displayData = {
                                sender_id: currentUser.id,
                                receiver_id: currentReceiverId,
                                name: currentUser.name,
                                email: currentUser.email,
                                message: data.filePath,
                                message_type: 'audio',
                                timestamp: new Date().toISOString()
                            };
                            appendMessage(displayData, 'right', elements.messageContainer);
                            socket.emit('send-audio', {
                                sender_id: currentUser.id,
                                receiver_id: currentReceiverId,
                                filePath: data.filePath
                            });
                        }
                    } catch (error) {
                        console.error('Audio upload error:', error);
                        alert('Failed to upload audio');
                    }
                });
            });
        }
        
        console.log('✅ Chat initialization complete');
    }

    // ========================================
    // START
    // ========================================
    console.log('📋 DOM ready state:', document.readyState);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChat);
    } else {
        initializeChat();
    }
})();