(function() {
    const CHAT_SERVER_URL = 'http://localhost:8000'; 
    const UPLOAD_SERVER_URL = 'http://localhost:3000'; 
    
    let userCity = "Unknown";
    let userName = "";
    
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

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = `${CHAT_SERVER_URL}/css/style.css`;
    document.head.appendChild(cssLink);

    const socketScript = document.createElement('script');
    socketScript.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
    socketScript.onload = () => {
        if (isLoggedIn) {
            createWidget();
        } else {
            createLoginPromptWidget();
        }
    };
    document.head.appendChild(socketScript);
    
    function createLoginPromptWidget() {
        // ... (Keep existing login prompt logic unchanged) ...
        const launcher = document.createElement('div');
        launcher.id = 'chat-launcher';
        launcher.innerHTML = `<i class="fa-solid fa-message"></i><span id="chat-unread-badge"></span>`;
        document.body.appendChild(launcher);

        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'chat-widget-container';
        widgetContainer.innerHTML = `
            <nav>
              <img src="${CHAT_SERVER_URL}/chat-icon.png" alt="logo" id="logo">
              <h1>KISAN CIRCLE🌾</h1>
              <button id="chat-widget-close-prompt">&times;</button>
            </nav>
            <div id="join-modal" style="display: flex; height: 100%; align-items: center; justify-content: center; text-align: center;">
              <div id="join-box">
                <h2>LOG IN TO JOIN</h2>
                <p>You must be logged into your account to access Kisan Circle chat.</p>
                <div style="margin-top: 20px; font-size: 1.1rem;">
                    <p style="margin-bottom: 5px; color: #555;">Proceed to:</p>
                    <a href="login.html" style="color: #5b21b6; text-decoration: underline; font-weight: 600;">Login Page</a>
                </div>
              </div>
            </div>`;
        document.body.appendChild(widgetContainer);
        const closeBtn = widgetContainer.querySelector('#chat-widget-close-prompt');
        launcher.addEventListener('click', () => { widgetContainer.classList.add('active'); launcher.style.display = 'none'; });
        closeBtn.addEventListener('click', () => { widgetContainer.classList.remove('active'); launcher.style.display = 'flex'; });
    }

    function createWidget() {
        // ... (Keep existing widget HTML unchanged) ...
        const launcher = document.createElement('div');
        launcher.id = 'chat-launcher';
        launcher.innerHTML = `<i class="fa-solid fa-message"></i><span id="chat-unread-badge"></span>`;
        
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'chat-widget-container';
        widgetContainer.innerHTML = `
            <nav>
              <img src="${CHAT_SERVER_URL}/chat-icon.png" alt="logo" id="logo">
              <h1>KISAN CIRCLE🌾</h1>
              <div id="user-count-container"><span id="user-count-dot"></span><span id="user-count-text">...</span></div>
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
        const socket = io(CHAT_SERVER_URL);
        const form = widget.querySelector('#send-container');
        const messageInput = widget.querySelector('#messageimp');
        const messageContainer = widget.querySelector('.container');
        const closeBtn = widget.querySelector('#chat-widget-close');
        const unreadBadge = launcher.querySelector('#chat-unread-badge');
        const userCountText = widget.querySelector('#user-count-text');
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

        launcher.addEventListener('click', () => { widget.classList.add('active'); launcher.style.display = 'none'; unreadCount = 0; unreadBadge.style.display = 'none'; });
        closeBtn.addEventListener('click', () => { widget.classList.remove('active'); launcher.style.display = 'flex'; });
        
        // UPDATED: Emit the FULL user object if available
        if (isLoggedIn && agriUser) {
             socket.emit('new-user-joined', agriUser);
        } else if (userName) {
             socket.emit('new-user-joined', userName);
        }

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
                    messageContent = `<a href="${UPLOAD_SERVER_URL}${data.filePath}" target="_blank"><img src="${UPLOAD_SERVER_URL}${data.filePath}" class="message-image" /></a>`;
                } else if (data.isAudio) {
                    messageContent = `<audio controls src="${UPLOAD_SERVER_URL}${data.filePath}"></audio>`;
                } else {
                    messageContent = data.message;
                }

                // --- UPDATED: Generate Name Link ---
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
                    
                    // Styled as a clickable link
                    nameHtml = `<a href="profile-viewer.html?${params.toString()}" class="message-name" style="text-decoration: underline; cursor: pointer;" title="View Profile">${name}</a>`;
                }
                // -----------------------------------

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

        // ... (Keep existing Event Listeners for submit, file upload, audio, etc.) ...
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = messageInput.value;
            if (message.trim() === '') return;
            append({ message: message, city: userCity, name: "You" }, 'right');
            socket.emit('send', { message: message, city: userCity });
            messageInput.value = '';
            socket.emit('stop-typing');
            isTyping = false;
            recordBtn.style.display = 'flex';
            sendBtn.style.display = 'none';
        });
        
        // ... (Keep existing handlers for image, audio, typing, receive events) ...
        attachFileBtn.addEventListener('click', () => { imageInput.click(); });
        imageInput.addEventListener('change', (e) => {
            // ... (Same upload logic) ...
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('image', file);
            append({ message: 'Uploading image...', name: 'You', city: userCity }, 'right');
            fetch(`${UPLOAD_SERVER_URL}/upload/image`, { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                messageContainer.removeChild(messageContainer.lastChild);
                append({ filePath: data.filePath, isImage: true, city: userCity, name: "You" }, 'right');
                socket.emit('send-image', { filePath: data.filePath, city: userCity });
            });
            e.target.value = null;
        });

        messageInput.addEventListener('input', () => {
            if (!isTyping) { isTyping = true; socket.emit('typing'); }
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => { isTyping = false; socket.emit('stop-typing'); }, 2000);
            if (messageInput.value.trim() !== '') { recordBtn.style.display = 'none'; sendBtn.style.display = 'flex'; } 
            else { recordBtn.style.display = 'flex'; sendBtn.style.display = 'none'; }
        });

        // Audio Recording logic (Keep same)
        recordBtn.addEventListener('mousedown', () => {
             // ... same recording logic ...
             if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('Browser not supported'); return; }
             navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                 isRecording = true; audioChunks = []; mediaRecorder = new MediaRecorder(stream); mediaRecorder.start(); recordBtn.classList.add('recording');
                 mediaRecorder.addEventListener("dataavailable", event => { audioChunks.push(event.data); });
             });
        });

        recordBtn.addEventListener('mouseup', () => {
            if (!isRecording) return;
            isRecording = false; mediaRecorder.stop(); recordBtn.classList.remove('recording');
            mediaRecorder.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', audioBlob, `audio-${Date.now()}.webm`);
                append({ message: 'Sending audio...', name: 'You', city: userCity }, 'right');
                fetch(`${UPLOAD_SERVER_URL}/upload/audio`, { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    messageContainer.removeChild(messageContainer.lastChild); 
                    append({ filePath: data.filePath, isAudio: true, city: userCity, name: "You" }, 'right');
                    socket.emit('send-audio', { filePath: data.filePath, city: userCity });
                });
            });
        });

        socket.on('user-joined', name => { if(name) append({ message: `${name} joined the chat` }, 'middle'); });
        
        socket.on('receive', data => { if(data.name) { append(data, 'left'); if (!widget.classList.contains('active')) { unreadCount++; unreadBadge.innerText = unreadCount; unreadBadge.style.display = 'flex'; } } });
        socket.on('receive-image', data => { if (data.name) { data.isImage = true; append(data, 'left'); if (!widget.classList.contains('active')) { unreadCount++; unreadBadge.innerText = unreadCount; unreadBadge.style.display = 'flex'; } } });
        socket.on('receive-audio', data => { if (data.name) { data.isAudio = true; append(data, 'left'); if (!widget.classList.contains('active')) { unreadCount++; unreadBadge.innerText = unreadCount; unreadBadge.style.display = 'flex'; } } });

        socket.on('user-typing', (name) => { typingIndicator.innerText = `${name} is typing...`; });
        socket.on('user-stop-typing', () => { typingIndicator.innerText = ''; });
        socket.on('user-left', name => { if(name) append({ message: `${name} left the chat` }, 'middle'); });
        socket.on('user-list-update', (users) => { userCountText.innerText = `${users.length} Online`; });
    }
    
    getUserLocation(); 
})();