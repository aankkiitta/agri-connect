// public/js/chat.js
(function() {
    console.log('🔄 KISAN CIRCLE Group Chat loaded...');
    
    const SERVER_URL = window.location.origin;
    console.log('🔗 Server URL:', SERVER_URL);
    
    let socket = null;
    let currentUser = null;
    let isConnected = false;
    let isTyping = false;
    let typingTimer;
    
    // ========================================
    // GET USER FROM localStorage
    // ========================================
    window.getCurrentUser = function() {
        try {
            const keys = ['agriUser', 'user', 'userData', 'authUser'];
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const user = JSON.parse(data);
                        const userId = user.id || user.user_id || user.userId || user._id || null;
                        if (userId) {
                            return {
                                id: parseInt(userId),
                                email: user.email || null,
                                name: user.name || user.username || 'User'
                            };
                        }
                    } catch (e) {}
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    };
    
    // ========================================
    // GET DOM ELEMENTS
    // ========================================
    function getElements() {
        return {
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
    }
    
    // ========================================
    // APPEND MESSAGE
    // ========================================
    function appendMessage(data, position, messageContainer) {
        if (!messageContainer) return;
        
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
        
        const time = data.created_at 
            ? new Date(data.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
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
        console.log(`✅ Message appended: ${messageContent.substring(0, 20)}...`);
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
                console.log(`📨 Received ${data.messages.length} messages from API`);
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
            } else {
                console.error('❌ Failed to load messages:', data);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }
    
    // ========================================
    // SEND MESSAGE FUNCTION
    // ========================================
    function sendMessage(messageInput, elements) {
        const message = messageInput.value.trim();
        console.log('📤 Attempting to send message:', message);
        
        if (!message) {
            console.log('❌ Empty message');
            return false;
        }
        
        if (!socket || !socket.connected) {
            console.log('❌ Socket not connected');
            alert('Please wait, connecting to chat...');
            return false;
        }
        
        if (!currentUser) {
            console.log('❌ No user');
            return false;
        }
        
        // Create temp message
        const tempMessage = {
            id: Date.now(),
            sender_id: currentUser.id,
            message: message,
            message_type: 'text',
            created_at: new Date().toISOString(),
            sender_name: currentUser.name,
            sender_email: currentUser.email
        };
        
        console.log('📤 Temp message:', tempMessage);
        
        // Remove "No messages" system message
        const systemMessages = elements.messageContainer.querySelectorAll('.message.middle');
        systemMessages.forEach(el => {
            if (el.innerText.includes('No messages yet')) {
                el.remove();
            }
        });
        
        // Add message to UI immediately (optimistic update)
        appendMessage(tempMessage, 'right', elements.messageContainer);
        
        const sendData = {
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_email: currentUser.email,
            message: message,
            message_type: 'text'
        };
        console.log('📤 Sending to socket:', sendData);
        
        socket.emit('send-message', sendData);
        console.log('📤 Message emitted to server');
        
        messageInput.value = '';
        messageInput.focus();
        
        return false;
    }
    
    // ========================================
    // INITIALIZE CHAT
    // ========================================
    window.initializeChat = function(user) {
        currentUser = user || window.getCurrentUser();
        
        if (!currentUser) {
            console.log('❌ No user logged in');
            return;
        }
        
        console.log('✅ Starting group chat for:', currentUser);
        
        const elements = getElements();
        if (!elements.widget) {
            console.error('❌ Chat widget not found');
            return;
        }
        
        // Connect to Socket.IO
        socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10
        });
        
        // Socket events
        socket.on('connect', () => {
            console.log('✅ Connected to chat server');
            isConnected = true;
            
            socket.emit('user-connected', {
                userId: currentUser.id,
                email: currentUser.email,
                name: currentUser.name
            });
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server');
            isConnected = false;
            if (elements.userCountText) elements.userCountText.textContent = 'Disconnected';
            if (elements.userCountDot) elements.userCountDot.style.backgroundColor = '#ff4444';
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
        });
        
        socket.on('user-connected-confirm', (data) => {
            console.log('✅ Connection confirmed:', data);
            loadChatHistory(elements.messageContainer);
        });
        
        socket.on('online-users', (onlineUsers) => {
            const count = onlineUsers ? onlineUsers.length : 0;
            console.log(`🟢 Online users: ${count}`);
            updateOnlineCount(count, elements);
        });
        
        socket.on('user-joined', (data) => {
            console.log('👤 User joined:', data);
            appendSystemMessage(data.message || `${data.name} joined the chat`, elements.messageContainer);
        });
        
        socket.on('user-left', (data) => {
            console.log('👤 User left:', data);
            appendSystemMessage(data.message || `${data.name} left the chat`, elements.messageContainer);
        });
        
        // ========================================
        // RECEIVE MESSAGE
        // ========================================
        socket.on('receive-message', (data) => {
            console.log('📨📨📨 New message received:', data);
            
            if (data.sender_id === currentUser.id) {
                console.log('⏭️ Skipping own message (already displayed from optimistic update)');
                return;
            }
            
            const position = 'left';
            appendMessage(data, position, elements.messageContainer);
        });
        
        socket.on('message-sent', (data) => {
            console.log('✅ Message sent confirmation:', data);
        });
        
        socket.on('message-error', (data) => {
            console.error('❌ Message error:', data);
            alert('Failed to send message: ' + data.error);
        });
        
        socket.on('user-typing', (data) => {
            if (elements.typingIndicator) {
                if (data.isTyping && data.userId !== currentUser.id) {
                    elements.typingIndicator.innerText = `${data.name} is typing...`;
                } else {
                    elements.typingIndicator.innerText = '';
                }
            }
        });
        
        // ========================================
        // SETUP SEND MESSAGE
        // ========================================
        const form = document.getElementById('send-container');
        const messageInput = document.getElementById('messageimp');
        const sendBtn = document.getElementById('send-btn');
        const recordBtn = document.getElementById('record-btn');
        
        if (!form || !messageInput) {
            console.error('❌ Form or input not found!');
            return;
        }
        
        console.log('✅ Form and input found, setting up handlers...');
        
        if (recordBtn) recordBtn.style.display = 'none';
        if (sendBtn) sendBtn.style.display = 'flex';
        
        form.addEventListener('submit', function(e) {
            console.log('📤 Form submit event triggered');
            e.preventDefault();
            e.stopPropagation();
            sendMessage(messageInput, elements);
            return false;
        });
        
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log('📤 Enter key pressed');
                e.preventDefault();
                e.stopPropagation();
                sendMessage(messageInput, elements);
                return false;
            }
        });
        
        if (sendBtn) {
            sendBtn.addEventListener('click', function(e) {
                console.log('📤 Send button clicked');
                e.preventDefault();
                e.stopPropagation();
                sendMessage(messageInput, elements);
                return false;
            });
        }
        
        // ========================================
        // TYPING INDICATOR
        // ========================================
        messageInput.addEventListener('input', function() {
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
        
        // ========================================
        // IMAGE UPLOAD
        // ========================================
        const attachFileBtn = document.getElementById('attach-file-btn');
        const imageInput = document.getElementById('image-input');
        
        if (attachFileBtn && imageInput) {
            attachFileBtn.addEventListener('click', () => {
                imageInput.click();
            });
            
            imageInput.addEventListener('change', async (e) => {
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
                            message: data.filePath,
                            message_type: 'image',
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
        
        console.log('✅ KISAN CIRCLE Group Chat ready!');
        console.log('📤 Type a message and press Enter or click Send');
    };

    // Auto-initialize if DOM is ready and user exists
    if (document.readyState !== 'loading') {
        const user = window.getCurrentUser();
        if (user && document.getElementById('chat-widget-container')) {
            window.initializeChat(user);
        }
    }
})();