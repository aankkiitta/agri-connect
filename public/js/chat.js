(function() {
    // Auto-detect server URL
    const SERVER_URL = window.location.origin;
    
    let userCity = "Unknown";
    let userName = "";
    let socket = null;
    let isConnected = false;
    
    let isLoggedIn = false;
    let agriUser = null;
    
    const userData = localStorage.getItem('agriUser');
    if (userData) {
        try {
            agriUser = JSON.parse(userData);
            isLoggedIn = true;
            userName = agriUser.name || "Farmer";
        } catch (e) {
            console.error("Failed to parse agriUser:", e);
        }
    }

    // Create widget based on login status
    if (isLoggedIn) {
        createWidget();
    } else {
        createLoginPromptWidget();
    }
    
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
            <div id="join-modal" style="display: flex; height: 100%; align-items: center; justify-content: center; text-align: center;">
              <div id="join-box">
                <h2>LOG IN TO JOIN</h2>
                <p>You must be logged into your account to access Kisan Circle chat.</p>
                <div style="margin-top: 20px; font-size: 1.1rem;">
                    <p style="margin-bottom: 5px; color: #555;">Proceed to:</p>
                    <a href="/login" style="color: #5b21b6; text-decoration: underline; font-weight: 600;">Login Page</a>
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

    function createWidget() {
        const launcher = document.createElement('div');
        launcher.id = 'chat-launcher';
        launcher.innerHTML = `<i class="fa-solid fa-message"></i><span id="chat-unread-badge"></span>`;
        
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'chat-widget-container';
        widgetContainer.innerHTML = `
            <nav>
              <h1>KISAN CIRCLE🌾</h1>
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
    
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();
                    if (data.address) userCity = data.address.city || data.address.state || "Unknown";
                } catch (e) { console.warn("Could not fetch city."); }
            }, () => {});
        }
    }

    function initializeChat(widget, launcher) {
        // Connect to socket.io on the same server
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

        // Socket connection events
        socket.on('connect', () => {
            console.log('✅ Connected to chat server');
            isConnected = true;
            userCountDot.style.backgroundColor = '#32CD32';
            userCountText.textContent = 'Online';
            
            // Send user data to server
            if (isLoggedIn && agriUser) {
                socket.emit('new-user-joined', agriUser);
            } else if (userName) {
                socket.emit('new-user-joined', userName);
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

        const append = (data, position) => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.classList.add(position);

            if (position === 'middle') {
                messageElement.innerText = data.message;
            } else {
                const time = data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const name = data.name || '';
                const city = data.city || 'Unknown';
                
                let messageContent = '';
                if (data.isImage) {
                    messageContent = `<a href="${data.filePath}" target="_blank"><img src="${data.filePath}" class="message-image" /></a>`;
                } else if (data.isAudio) {
                    messageContent = `<audio controls src="${data.filePath}"></audio>`;
                } else {
                    messageContent = data.message;
                }

                let nameHtml = `<span class="message-name">${name}</span>`;

                // If it's an incoming message (left) and we have profile data
                if (position === 'left' && data.userProfile) {
                    const u = data.userProfile;
                    const isExpert = (parseInt(u.years_experience) || 0) >= 7;
                    
                    const params = new URLSearchParams({
                        name: u.name,
                        email: u.email || 'Not Listed',
                        contact: u.contact_number || '',
                        pic: u.profile_picture_url || '/uploads/default.png',
                        experience: u.years_experience || '0',
                        location: u.location || city,
                        isExpert: isExpert
                    });
                    
                    nameHtml = `<a href="/profile-viewer.html?${params.toString()}" class="message-name" style="text-decoration: underline; cursor: pointer;" title="View Profile">${name}</a>`;
                }

                messageElement.innerHTML = `
                    <div class="message-body">${messageContent}</div>
                    <div class="message-header">
                        ${position === 'right' ? '' : nameHtml}
                        <span class="message-info">${position === 'right' ? '' : (city + ' · ')} ${time}</span>
                    </div>
                `;
            }
            messageContainer.append(messageElement);
            messageContainer.scrollTop = messageContainer.scrollHeight;
        };

        // Receive chat history
        socket.on('chat-history', (messages) => {
            messageContainer.innerHTML = '';
            if (messages && messages.length > 0) {
                messages.forEach(msg => {
                    if (msg.message) {
                        append(msg, 'left');
                    } else if (msg.isImage) {
                        append(msg, 'left');
                    } else if (msg.isAudio) {
                        append(msg, 'left');
                    }
                });
            }
        });

        // Handle real-time message receiving
        socket.on('receive', (data) => {
            if (data.name) {
                append(data, 'left');
                if (!widget.classList.contains('active')) {
                    unreadCount++;
                    unreadBadge.innerText = unreadCount;
                    unreadBadge.style.display = 'flex';
                }
            }
        });

        socket.on('receive-image', (data) => {
            if (data.name) {
                data.isImage = true;
                append(data, 'left');
                if (!widget.classList.contains('active')) {
                    unreadCount++;
                    unreadBadge.innerText = unreadCount;
                    unreadBadge.style.display = 'flex';
                }
            }
        });

        socket.on('receive-audio', (data) => {
            if (data.name) {
                data.isAudio = true;
                append(data, 'left');
                if (!widget.classList.contains('active')) {
                    unreadCount++;
                    unreadBadge.innerText = unreadCount;
                    unreadBadge.style.display = 'flex';
                }
            }
        });

        socket.on('user-joined', (name) => {
            if (name) append({ message: `${name} joined the chat` }, 'middle');
        });

        socket.on('user-left', (name) => {
            if (name) append({ message: `${name} left the chat` }, 'middle');
        });

        socket.on('user-list-update', (users) => {
            userCountText.textContent = `${users.length} Online`;
        });

        socket.on('user-typing', (name) => {
            typingIndicator.innerText = `${name} is typing...`;
        });

        socket.on('user-stop-typing', () => {
            typingIndicator.innerText = '';
        });

        // Send message
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = messageInput.value;
            if (message.trim() === '' || !socket) return;
            
            const messageData = {
                message: message,
                city: userCity,
                name: "You"
            };
            
            // Display message immediately for sender
            append(messageData, 'right');
            
            // Send to server
            socket.emit('send', { message: message, city: userCity });
            
            messageInput.value = '';
            socket.emit('stop-typing');
            isTyping = false;
            recordBtn.style.display = 'flex';
            sendBtn.style.display = 'none';
        });

        // Image upload
        attachFileBtn.addEventListener('click', () => { imageInput.click(); });
        
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append('image', file);
            
            append({ message: 'Uploading image...', name: 'You', city: userCity }, 'right');
            
            fetch(`${SERVER_URL}/upload/image`, { 
                method: 'POST', 
                body: formData 
            })
            .then(res => res.json())
            .then(data => {
                if (data.filePath) {
                    // Remove upload message
                    const lastMsg = messageContainer.lastChild;
                    if (lastMsg && lastMsg.textContent.includes('Uploading image...')) {
                        messageContainer.removeChild(lastMsg);
                    }
                    
                    const imageData = {
                        filePath: data.filePath,
                        isImage: true,
                        city: userCity,
                        name: "You"
                    };
                    append(imageData, 'right');
                    socket.emit('send-image', { filePath: data.filePath, city: userCity });
                }
            })
            .catch(err => {
                console.error('Upload error:', err);
                alert('Failed to upload image');
            });
            e.target.value = null;
        });

        // Typing indicator
        messageInput.addEventListener('input', () => {
            if (!isTyping && socket) { 
                isTyping = true; 
                socket.emit('typing'); 
            }
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => { 
                isTyping = false; 
                if (socket) socket.emit('stop-typing'); 
            }, 2000);
            
            if (messageInput.value.trim() !== '') { 
                recordBtn.style.display = 'none'; 
                sendBtn.style.display = 'flex'; 
            } else { 
                recordBtn.style.display = 'flex'; 
                sendBtn.style.display = 'none'; 
            }
        });

        // Audio recording
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

        recordBtn.addEventListener('mouseup', () => {
            if (!isRecording || !mediaRecorder) return;
            isRecording = false; 
            mediaRecorder.stop(); 
            recordBtn.classList.remove('recording');
            
            mediaRecorder.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', audioBlob, `audio-${Date.now()}.webm`);
                
                append({ message: 'Sending audio...', name: 'You', city: userCity }, 'right');
                
                fetch(`${SERVER_URL}/upload/audio`, { 
                    method: 'POST', 
                    body: formData 
                })
                .then(res => res.json())
                .then(data => {
                    if (data.filePath) {
                        const lastMsg = messageContainer.lastChild;
                        if (lastMsg && lastMsg.textContent.includes('Sending audio...')) {
                            messageContainer.removeChild(lastMsg);
                        }
                        
                        const audioData = {
                            filePath: data.filePath,
                            isAudio: true,
                            city: userCity,
                            name: "You"
                        };
                        append(audioData, 'right');
                        socket.emit('send-audio', { filePath: data.filePath, city: userCity });
                    }
                })
                .catch(err => {
                    console.error('Audio upload error:', err);
                    alert('Failed to upload audio');
                });
            });
        });
    }
    
    getUserLocation(); 
})();