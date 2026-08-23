(function() {
    console.log('🔄 Chat.js loaded...');
    
    const SERVER_URL = window.location.origin;
    let socket = null;
    let currentUser = null;
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
        try {
            // Try all possible storage keys
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
        
        if (!elements.messageContainer) {
            elements.messageContainer = document.querySelector('.container');
        }
        
        return elements;
    }

    // ========================================
    // SHOW LOGIN PROMPT - FIXED
    // ========================================
    function showLoginPrompt() {
        const container = document.getElementById('chat-widget-container');
        if (container) {
            container.innerHTML = `
                <nav>
                    <h1>🔐 KISAN CIRCLE</h1>
                </nav>
                <div style="flex:1; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.1); backdrop-filter:blur(10px); padding:20px;">
                    <div style="background:white; padding:40px; border-radius:20px; text-align:center; max-width:400px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                        <h2 style="margin:0 0 10px 0; color:#333;">🔐 LOGIN REQUIRED</h2>
                        <p style="color:#666; margin:15px 0; line-height:1.6;">
                            Please login to access Kisan Circle chat.
                        </p>
                        <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
                            <a href="/login" style="background:linear-gradient(135deg, #6C4DFF, #8B5CFF); color:white; padding:12px 30px; border-radius:25px; text-decoration:none; font-weight:600; display:inline-block;">Go to Login</a>
                            <p style="font-size:0.8rem; color:#999; margin:5px 0 0 0;">
                                After login, refresh this page
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // ========================================
    // APPEND MESSAGE
    // ========================================
    function appendMessage(data, position, messageContainer, currentUser) {
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

    function appendSystemMessage(text, messageContainer) {
        if (!messageContainer) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'middle');
        messageElement.innerText = text;
        messageContainer.append(messageElement);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    // ========================================
    // INITIALIZE CHAT
    // ========================================
    function initializeChat() {
        currentUser = getCurrentUser();
        
        if (!currentUser) {
            console.log('❌ No user logged in - showing login prompt');
            showLoginPrompt();
            return;
        }
        
        console.log('✅ Starting chat...');
        console.log('👤 User:', currentUser);
        
        const elements = getElements();
        
        if (!elements.widget) {
            console.error('❌ Chat widget not found');
            return;
        }

        console.log(`🔗 Server URL: ${SERVER_URL}`);

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
            
            if (elements.userCountDot) elements.userCountDot.style.backgroundColor = '#32CD32';
            if (elements.userCountText) elements.userCountText.textContent = 'Online';
            
            if (currentUser) {
                console.log('📤 Sending user data:', currentUser);
                socket.emit('user-connected', currentUser);
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server');
            isConnected = false;
            if (elements.userCountDot) elements.userCountDot.style.backgroundColor = '#ff4444';
            if (elements.userCountText) elements.userCountText.textContent = 'Offline';
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
                        const isOwn = msg.email === currentUser.email || msg.userId === currentUser.id;
                        const position = isOwn ? 'right' : 'left';
                        appendMessage(msg, position, elements.messageContainer, currentUser);
                    });
                }
            }
        });

        // ========================================
        // RECEIVE MESSAGE (REAL-TIME)
        // ========================================
        socket.on('receive-message', (data) => {
            console.log('📨📨📨 MESSAGE RECEIVED:', data);
            
            const isOwn = data.email === currentUser.email || data.userId === currentUser.id;
            const position = isOwn ? 'right' : 'left';
            appendMessage(data, position, elements.messageContainer, currentUser);
        });

        // ========================================
        // ONLINE USERS
        // ========================================
        socket.on('online-users', (users) => {
            console.log('🟢 Online users:', users);
            const count = users ? users.length : 0;
            if (elements.userCountText) {
                elements.userCountText.textContent = count > 0 ? `${count} Online` : '0 Online';
            }
            if (elements.userCountDot) {
                elements.userCountDot.style.backgroundColor = count > 0 ? '#32CD32' : '#ff4444';
            }
        });

        // ========================================
        // USER JOINED/LEFT
        // ========================================
        socket.on('user-joined', (data) => {
            console.log('👤 User joined:', data);
            appendSystemMessage(data.message, elements.messageContainer);
        });

        socket.on('user-left', (data) => {
            console.log('👤 User left:', data);
            appendSystemMessage(data.message, elements.messageContainer);
        });

        // ========================================
        // TYPING INDICATOR
        // ========================================
        socket.on('user-typing', (data) => {
            if (elements.typingIndicator) {
                if (data.isTyping) {
                    elements.typingIndicator.innerText = `${data.name} is typing...`;
                } else {
                    elements.typingIndicator.innerText = '';
                }
            }
        });

        // ========================================
        // SEND MESSAGE
        // ========================================
        if (elements.form) {
            const updatedForm = elements.form;
            const updatedMessageInput = document.getElementById('messageimp');
            const updatedSendBtn = document.getElementById('send-btn');
            const updatedRecordBtn = document.getElementById('record-btn');
            
            updatedForm.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const message = updatedMessageInput ? updatedMessageInput.value.trim() : '';
                
                if (!message) {
                    console.log('❌ Empty message');
                    return;
                }
                
                if (!socket || !socket.connected) {
                    console.log('❌ Socket not connected');
                    alert('Please wait, connecting to chat...');
                    return;
                }
                
                if (!currentUser) {
                    console.log('❌ No user logged in');
                    alert('Please login first');
                    return;
                }
                
                const messageData = {
                    message: message,
                    message_type: 'text'
                };
                
                const displayData = {
                    message: message,
                    message_type: 'text',
                    name: currentUser.name,
                    email: currentUser.email,
                    userId: currentUser.id,
                    timestamp: new Date().toISOString()
                };
                appendMessage(displayData, 'right', elements.messageContainer, currentUser);
                
                socket.emit('send-message', messageData);
                console.log('📤 Message sent to server');
                
                updatedMessageInput.value = '';
                updatedMessageInput.focus();
                
                if (updatedRecordBtn) updatedRecordBtn.style.display = 'flex';
                if (updatedSendBtn) updatedSendBtn.style.display = 'none';
                
                return false;
            });
            
            if (updatedMessageInput) {
                updatedMessageInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        updatedForm.dispatchEvent(new Event('submit'));
                        return false;
                    }
                });
                
                updatedMessageInput.addEventListener('input', function() {
                    if (this.value.trim() !== '') {
                        if (updatedSendBtn) updatedSendBtn.style.display = 'flex';
                        if (updatedRecordBtn) updatedRecordBtn.style.display = 'none';
                    } else {
                        if (updatedSendBtn) updatedSendBtn.style.display = 'none';
                        if (updatedRecordBtn) updatedRecordBtn.style.display = 'flex';
                    }
                });
            }
        }

        // ========================================
        // TYPING
        // ========================================
        if (elements.messageInput) {
            elements.messageInput.addEventListener('input', function() {
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
            });
        }

        // ========================================
        // IMAGE UPLOAD
        // ========================================
        if (elements.attachFileBtn && elements.imageInput) {
            elements.attachFileBtn.addEventListener('click', () => { elements.imageInput.click(); });
            
            elements.imageInput.addEventListener('change', async (e) => {
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
                        appendMessage(displayData, 'right', elements.messageContainer, currentUser);
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
                                message: data.filePath,
                                message_type: 'audio',
                                name: currentUser.name,
                                email: currentUser.email,
                                userId: currentUser.id,
                                timestamp: new Date().toISOString()
                            };
                            appendMessage(displayData, 'right', elements.messageContainer, currentUser);
                            socket.emit('send-audio', { filePath: data.filePath });
                        }
                    } catch (error) {
                        console.error('Audio upload error:', error);
                        alert('Failed to upload audio');
                    }
                });
            });
        }
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