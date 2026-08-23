(function() {
    // ========================================
    // AUTO-DETECT SERVER URL (Works on both local and live)
    // ========================================
    const SERVER_URL = window.location.origin;
    
    let socket = null;
    let currentUserId = null;
    let currentReceiverId = null;
    let currentRoomId = null;
    let isConnected = false;
    
    // ========================================
    // GET USER ID FROM localStorage
    // ========================================
    function getCurrentUser() {
        try {
            // Check all possible storage keys
            const keys = ['agriUser', 'user', 'userData', 'authUser'];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const user = JSON.parse(data);
                        console.log(`✅ Found user in localStorage key: ${key}`, user);
                        
                        // Try all possible ID fields
                        const userId = user.id || user.user_id || user.userId || user._id || null;
                        if (userId) {
                            console.log(`✅ User ID: ${userId}`);
                            return user;
                        }
                    } catch (e) {}
                }
            }
            
            // Check sessionStorage
            const sessionData = sessionStorage.getItem('user');
            if (sessionData) {
                try {
                    const user = JSON.parse(sessionData);
                    const userId = user.id || user.user_id || user.userId || user._id || null;
                    if (userId) {
                        console.log('✅ Found user in sessionStorage:', user);
                        return user;
                    }
                } catch (e) {}
            }
            
            console.warn('⚠️ No user data found');
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    // Get current user
    const agriUser = getCurrentUser();
    if (agriUser) {
        currentUserId = agriUser.id || agriUser.user_id || agriUser.userId || agriUser._id || null;
        console.log('👤 Current User:', agriUser);
        console.log('🆔 Current User ID:', currentUserId);
    }

    // ========================================
    // GET RECEIVER ID FROM URL
    // ========================================
    function getReceiverIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('userId') || 
                   params.get('receiverId') || 
                   params.get('id') || 
                   params.get('user') ||
                   params.get('receiver');
        
        console.log('📥 Receiver ID from URL:', id);
        return id;
    }

    const receiverId = getReceiverIdFromURL();
    
    // ========================================
    // START CHAT
    // ========================================
    if (currentUserId && receiverId) {
        currentReceiverId = parseInt(receiverId);
        console.log(`✅ Starting chat: User ${currentUserId} with User ${currentReceiverId}`);
        initializeChatWidget();
    } else {
        console.log('❌ Missing user IDs');
        if (!currentUserId) {
            createLoginPromptWidget();
        } else if (!receiverId) {
            createNoReceiverWidget();
        }
    }

    // ========================================
    // CREATE WIDGETS
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
              <h1>KISAN CIRCLE🌾</h1>
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

    function createNoReceiverWidget() {
        const launcher = document.createElement('div');
        launcher.id = 'chat-launcher';
        launcher.innerHTML = `<i class="fa-solid fa-message"></i><span id="chat-unread-badge"></span>`;
        document.body.appendChild(launcher);

        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'chat-widget-container';
        widgetContainer.innerHTML = `
            <nav>
              <h1>KISAN CIRCLE🌾</h1>
              <button id="chat-widget-close-prompt">&times;</button>
            </nav>
            <div id="join-modal">
              <div id="join-box">
                <h2>👤 SELECT A USER</h2>
                <p>Use: <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">/chat?userId=2</code></p>
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
    // INITIALIZE CHAT
    // ========================================
    function initializeChatWidget() {
        const launcher = document.createElement('div');
        launcher.id = 'chat-launcher';
        launcher.innerHTML = `<i class="fa-solid fa-message"></i><span id="chat-unread-badge"></span>`;
        
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'chat-widget-container';
        widgetContainer.innerHTML = `
            <nav>
              <h1>💬 CHAT</h1>
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
                    <button type="button" class="btn-icon" id="attach-file-btn"><i class="fa-solid fa-paperclip"></i></button>
                    <input type="text" name="messageimp" id="messageimp" placeholder="Type a message..." autocomplete="off">
                    <button class="btn" type="submit" id="send-btn" style="display: none;"><i class="fa-solid fa-paper-plane"></i></button>
                    <button type="button" class="btn" id="record-btn"><i class="fa-solid fa-microphone"></i></button>
                </form>
            </div>`;
        
        document.body.appendChild(launcher);
        document.body.appendChild(widgetContainer);
        initializeChat(widgetContainer, launcher);
    }

    // ========================================
    // MAIN CHAT LOGIC
    // ========================================
    function initializeChat(widget, launcher) {
        console.log('🔄 Initializing chat...');
        console.log(`👤 Current User: ${currentUserId}, Receiver: ${currentReceiverId}`);
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
        const closeBtn = widget.querySelector('#chat-widget-close');
        const unreadBadge = launcher.querySelector('#chat-unread-badge');
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
            userCountDot.style.backgroundColor = '#32CD32';
            userCountText.textContent = 'Online';
            
            if (currentUserId) {
                console.log(`📤 Emitting user-connected: ${currentUserId}`);
                socket.emit('user-connected', { userId: currentUserId });
            }
            
            if (currentUserId && currentReceiverId) {
                console.log(`📤 Emitting join-conversation: ${currentUserId} -> ${currentReceiverId}`);
                socket.emit('join-conversation', {
                    userId: currentUserId,
                    receiverId: currentReceiverId
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server');
            isConnected = false;
            userCountDot.style.backgroundColor = '#ff4444';
            userCountText.textContent = 'Offline';
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            userCountDot.style.backgroundColor = '#ffaa00';
            userCountText.textContent = 'Reconnecting...';
        });

        socket.on('conversation-joined', (data) => {
            console.log('✅ Conversation joined:', data);
            currentRoomId = data.roomId;
            userCountText.textContent = `Chatting`;
        });

        socket.on('chat-history', (messages) => {
            console.log(`📨 Received ${messages ? messages.length : 0} messages`);
            messageContainer.innerHTML = '';
            if (messages && messages.length > 0) {
                messages.forEach(msg => {
                    const position = msg.sender_id === currentUserId ? 'right' : 'left';
                    appendMessage(msg, position);
                });
                socket.emit('messages-seen', {
                    userId: currentUserId,
                    receiverId: currentReceiverId
                });
            }
        });

        socket.on('online-users', (users) => {
            console.log('🟢 Online users:', users);
            const isReceiverOnline = users.includes(currentReceiverId);
            if (isReceiverOnline) {
                userCountText.textContent = 'Online';
                userCountDot.style.backgroundColor = '#32CD32';
            } else {
                userCountText.textContent = 'Offline';
                userCountDot.style.backgroundColor = '#ff4444';
            }
        });

        // ========================================
        // RECEIVE MESSAGE - CRITICAL FIX
        // ========================================
        socket.on('receive-message', (data) => {
            console.log('📨📨📨 MESSAGE RECEIVED:', data);
            console.log('📨 Current User:', currentUserId, 'Receiver:', currentReceiverId);
            
            // Check if message belongs to this conversation
            const isForThisConversation = 
                (data.sender_id === currentUserId && data.receiver_id === currentReceiverId) ||
                (data.sender_id === currentReceiverId && data.receiver_id === currentUserId);
            
            console.log('📨 Is for this conversation?', isForThisConversation);
            
            if (isForThisConversation) {
                console.log('✅ Message belongs to this conversation');
                const position = data.sender_id === currentUserId ? 'right' : 'left';
                appendMessage(data, position);
                
                socket.emit('messages-seen', {
                    userId: currentUserId,
                    receiverId: currentReceiverId
                });
                
                if (!widget.classList.contains('active')) {
                    unreadCount++;
                    unreadBadge.innerText = unreadCount;
                    unreadBadge.style.display = 'flex';
                }
            } else {
                console.log('❌ Message NOT for this conversation');
                console.log('Expected:', currentUserId, '->', currentReceiverId);
                console.log('Got:', data.sender_id, '->', data.receiver_id);
            }
        });

        socket.on('user-typing', (data) => {
            if (data.userId === currentReceiverId) {
                typingIndicator.innerText = data.isTyping ? 'User is typing...' : '';
            }
        });

        // ========================================
        // APPEND MESSAGE
        // ========================================
        function appendMessage(data, position) {
            console.log('📝 Appending message:', data, 'Position:', position);
            
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.classList.add(position);

            const time = data.timestamp 
                ? new Date(data.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

            let messageContent = data.message || data.text || '';
            
            if (data.message_type === 'image') {
                messageContent = `<a href="${data.message}" target="_blank"><img src="${data.message}" class="message-image" /></a>`;
            } else if (data.message_type === 'audio') {
                messageContent = `<audio controls src="${data.message}"></audio>`;
            }
            
            messageElement.innerHTML = `
                <div class="message-body">${messageContent}</div>
                <div class="message-header">
                    <span class="message-info">${time}</span>
                </div>
            `;
            
            messageContainer.append(messageElement);
            messageContainer.scrollTop = messageContainer.scrollHeight;
            console.log('✅ Message appended to UI');
        }

        // ========================================
        // SEND MESSAGE
        // ========================================
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = messageInput.value.trim();
            
            console.log('📤 SEND BUTTON CLICKED');
            console.log('📤 Message:', message);
            console.log('📤 Current User:', currentUserId);
            console.log('📤 Receiver:', currentReceiverId);
            
            if (!message || !socket || !currentUserId || !currentReceiverId) {
                console.error('❌ Cannot send message - missing data');
                return;
            }
            
            const messageData = {
                sender_id: currentUserId,
                receiver_id: currentReceiverId,
                message: message,
                message_type: 'text',
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 Sending message data:', messageData);
            
            // Display immediately for sender
            appendMessage(messageData, 'right');
            
            // Send to server
            socket.emit('send-message', messageData);
            console.log('📤 Message emitted to server');
            
            messageInput.value = '';
            socket.emit('stop-typing', { 
                userId: currentUserId, 
                receiverId: currentReceiverId 
            });
            isTyping = false;
            recordBtn.style.display = 'flex';
            sendBtn.style.display = 'none';
        });

        // ========================================
        // TYPING
        // ========================================
        messageInput.addEventListener('input', () => {
            if (!isTyping && socket && currentUserId && currentReceiverId) { 
                isTyping = true; 
                socket.emit('typing', { 
                    userId: currentUserId, 
                    receiverId: currentReceiverId 
                });
            }
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => { 
                isTyping = false; 
                if (socket && currentUserId && currentReceiverId) {
                    socket.emit('stop-typing', { 
                        userId: currentUserId, 
                        receiverId: currentReceiverId 
                    });
                }
            }, 2000);
            
            if (messageInput.value.trim() !== '') { 
                recordBtn.style.display = 'none'; 
                sendBtn.style.display = 'flex'; 
            } else { 
                recordBtn.style.display = 'flex'; 
                sendBtn.style.display = 'none'; 
            }
        });

        // ========================================
        // IMAGE UPLOAD
        // ========================================
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
                    const messageData = {
                        sender_id: currentUserId,
                        receiver_id: currentReceiverId,
                        message: data.filePath,
                        message_type: 'image',
                        timestamp: new Date().toISOString()
                    };
                    
                    appendMessage(messageData, 'right');
                    socket.emit('send-message', messageData);
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Failed to upload image');
            }
            e.target.value = null;
        });

        // ========================================
        // AUDIO RECORDING
        // ========================================
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
                        const messageData = {
                            sender_id: currentUserId,
                            receiver_id: currentReceiverId,
                            message: data.filePath,
                            message_type: 'audio',
                            timestamp: new Date().toISOString()
                        };
                        
                        appendMessage(messageData, 'right');
                        socket.emit('send-message', messageData);
                    }
                } catch (error) {
                    console.error('Audio upload error:', error);
                    alert('Failed to upload audio');
                }
            });
        });

        // ========================================
        // LAUNCHER
        // ========================================
        launcher.addEventListener('click', () => { 
            widget.classList.add('active'); 
            launcher.style.display = 'none'; 
            unreadCount = 0; 
            unreadBadge.style.display = 'none'; 
        });
        
        closeBtn.addEventListener('click', () => { 
            widget.classList.remove('active'); 
            launcher.style.display = 'flex'; 
        });
    }
})();