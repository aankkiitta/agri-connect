(function() {
    console.log('🔄 Chat.js loaded...');
    
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
    // CHECK IF FULL PAGE OR WIDGET
    // ========================================
    const isFullPage = document.getElementById('chat-widget-container') !== null && 
                       document.getElementById('chat-widget-container').classList.contains('full-page');

    // ========================================
    // START CHAT
    // ========================================
    if (currentUser) {
        console.log('✅ Starting chat...');
        initializeChat();
    } else {
        console.log('❌ No user logged in');
        if (isFullPage) {
            showLoginPrompt();
        }
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
    // INITIALIZE CHAT
    // ========================================
    function initializeChat() {
        // Get DOM elements
        const widget = document.getElementById('chat-widget-container');
        const form = document.getElementById('send-container');
        const messageInput = document.getElementById('messageimp');
        const messageContainer = document.getElementById('messageContainer') || document.querySelector('.container');
        const userCountText = document.getElementById('user-count-text');
        const userCountDot = document.getElementById('user-count-dot');
        const attachFileBtn = document.getElementById('attach-file-btn');
        const imageInput = document.getElementById('image-input');
        const sendBtn = document.getElementById('send-btn');
        const recordBtn = document.getElementById('record-btn');
        const typingIndicator = document.getElementById('typing-indicator');

        if (!widget) {
            console.error('❌ Chat widget not found');
            return;
        }

        console.log('🔄 Initializing chat...');
        console.log('👤 User:', currentUser);
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

        // ========================================
        // RECEIVE CHAT HISTORY
        // ========================================
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

        // ========================================
        // RECEIVE MESSAGE (REAL-TIME)
        // ========================================
        socket.on('receive-message', (data) => {
            console.log('📨📨📨 MESSAGE RECEIVED:', data);
            
            const isOwn = data.email === currentUser.email || data.userId === currentUser.id;
            const position = isOwn ? 'right' : 'left';
            appendMessage(data, position);
        });

        // ========================================
        // ONLINE USERS
        // ========================================
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

        // ========================================
        // USER JOINED/LEFT
        // ========================================
        socket.on('user-joined', (data) => {
            console.log('👤 User joined:', data);
            appendSystemMessage(data.message);
        });

        socket.on('user-left', (data) => {
            console.log('👤 User left:', data);
            appendSystemMessage(data.message);
        });

        // ========================================
        // TYPING INDICATOR
        // ========================================
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
        // SEND MESSAGE - FIXED (No Page Refresh)
        // ========================================
      // ========================================
// SEND MESSAGE - COMPLETE FIX
// ========================================
if (form) {
    // Remove any existing listeners to prevent duplicates
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Re-get the form reference
    const updatedForm = document.getElementById('send-container');
    const updatedMessageInput = document.getElementById('messageimp');
    const updatedSendBtn = document.getElementById('send-btn');
    const updatedRecordBtn = document.getElementById('record-btn');
    
    // Handle form submission
    updatedForm.addEventListener('submit', function(e) {
        e.preventDefault(); // ✅ CRITICAL - Prevents page refresh
        
        const message = updatedMessageInput ? updatedMessageInput.value.trim() : '';
        
        console.log('📤 Sending message:', message);
        
        if (!message) {
            console.log('❌ Empty message - ignoring');
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
        
        // Display immediately for sender
        const displayData = {
            message: message,
            message_type: 'text',
            name: currentUser.name,
            email: currentUser.email,
            userId: currentUser.id,
            timestamp: new Date().toISOString()
        };
        appendMessage(displayData, 'right');
        
        // Send to server
        socket.emit('send-message', messageData);
        console.log('📤 Message sent to server');
        
        // Clear input
        updatedMessageInput.value = '';
        updatedMessageInput.focus();
        
        // Reset UI
        if (updatedRecordBtn) updatedRecordBtn.style.display = 'flex';
        if (updatedSendBtn) updatedSendBtn.style.display = 'none';
    });
    
    // Handle Enter key (extra safety)
    updatedMessageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // ✅ Prevents default Enter behavior
            updatedForm.dispatchEvent(new Event('submit'));
        }
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

        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        let isTyping = false;
        let typingTimer;
    }
})();