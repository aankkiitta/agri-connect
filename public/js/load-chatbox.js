// public/js/load-chatbox.js
(function() {
    "use strict";

    let isLoaded = false;

    function loadChat() {
        if (isLoaded) return;
        
        const container = document.getElementById('chatbox-container');
        if (!container) {
            console.error('❌ #chatbox-container not found!');
            return;
        }

        console.log('🔄 Loading chat...');

        // Clear container
        container.innerHTML = '';
        container.style.cssText = `
            position: fixed;
            bottom: 0;
            right: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999999;
            overflow: visible;
        `;

        // Create FAB button directly (no need to load chat.html)
        const fabContainer = document.createElement('div');
        fabContainer.id = 'chat-fab-container';
        fabContainer.style.cssText = `
            position: fixed !important;
            bottom: 28px !important;
            right: 28px !important;
            z-index: 1000000 !important;
            pointer-events: auto !important;
            transition: opacity 0.25s ease, transform 0.25s ease !important;
        `;

        fabContainer.innerHTML = `
            <button id="chat-fab" class="chat-fab" aria-label="Open chat" style="
                width: 62px;
                height: 62px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6C4DFF, #8B5CFF);
                color: white;
                border: none;
                box-shadow: 0 8px 28px rgba(108, 77, 255, 0.45);
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            ">
                <i class="fas fa-comment-dots" style="font-size: 28px;"></i>
                <span class="chat-notification" id="chatNotification" style="
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: #FF4444;
                    color: white;
                    border-radius: 50%;
                    width: 22px;
                    height: 22px;
                    font-size: 11px;
                    font-weight: 700;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid white;
                ">1</span>
            </button>
        `;

        // Create Modal
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'chat-modal-overlay';
        modalOverlay.className = 'chat-modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.55) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            z-index: 999999 !important;
            display: none !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 16px !important;
            pointer-events: auto !important;
        `;

        modalOverlay.innerHTML = `
            <div id="chat-modal" class="chat-modal" style="
                width: 420px;
                height: 600px;
                max-width: 96vw;
                max-height: 92vh;
                background: linear-gradient(135deg, #ADA9E8, #434361, #00D4FF);
                border-radius: 24px;
                box-shadow: 0 24px 72px rgba(0,0,0,0.6);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                position: relative;
                pointer-events: auto;
            ">
                <div id="chat-modal-content" style="display:flex; flex:1; flex-direction:column; min-height:0; height:100%;">
                    <div id="chat-loading" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; background:rgba(255,255,255,0.05); backdrop-filter:blur(6px);">
                        <div style="width:40px; height:40px; border:4px solid rgba(255,255,255,0.2); border-top-color:#fff; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
                        <p style="color:rgba(255,255,255,0.8);">Loading chat…</p>
                    </div>
                    <div id="chat-widget-placeholder" style="display:none; flex:1; flex-direction:column; min-height:0; height:100%;"></div>
                </div>
            </div>
        `;

        // Append to container
        container.appendChild(fabContainer);
        container.appendChild(modalOverlay);

        // Load Socket.IO if needed
        if (typeof io === 'undefined') {
            const socketScript = document.createElement('script');
            socketScript.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
            document.head.appendChild(socketScript);
        }

        // Load chat.js for messaging
        if (!document.querySelector('script[src*="chat.js"]')) {
            const chatJs = document.createElement('script');
            chatJs.src = '/js/chat.js';
            chatJs.onload = function() {
                console.log('✅ chat.js loaded');
                // Initialize chat after load
                setTimeout(() => {
                    const user = window.getCurrentUser ? window.getCurrentUser() : null;
                    if (user && window.initializeChat) {
                        window.initializeChat(user);
                    }
                }, 100);
            };
            document.body.appendChild(chatJs);
        }

        // Setup chat controls
        const fab = document.getElementById('chat-fab');
        const overlay = document.getElementById('chat-modal-overlay');
        const placeholder = document.getElementById('chat-widget-placeholder');
        const loadingEl = document.getElementById('chat-loading');

        // Build chat widget
        function buildChatWidget() {
            const container = document.createElement('div');
            container.id = 'chat-widget-container';
            container.style.cssText = 'width:100%; height:100%; display:flex; flex-direction:column; background:transparent; overflow:hidden;';

            const nav = document.createElement('nav');
            nav.innerHTML = `
                <h1>💬 KISAN CIRCLE</h1>
                <div id="user-count-container">
                    <span id="user-count-dot"></span>
                    <span id="user-count-text">0 Online</span>
                </div>
                <button id="chat-widget-close" aria-label="Close chat">&times;</button>
            `;
            container.appendChild(nav);

            const msgContainer = document.createElement('div');
            msgContainer.className = 'container active';
            msgContainer.id = 'messageContainer';
            container.appendChild(msgContainer);

            const typing = document.createElement('div');
            typing.id = 'typing-indicator';
            container.appendChild(typing);

            const sendArea = document.createElement('div');
            sendArea.className = 'send active';
            sendArea.id = 'chat-input-area';
            sendArea.innerHTML = `
                <input type="file" id="image-input" accept="image/*" style="display:none;">
                <form id="send-container">
                    <button type="button" class="btn-icon" id="attach-file-btn">
                        <i class="fa-solid fa-paperclip"></i>
                    </button>
                    <input type="text" name="messageimp" id="messageimp" placeholder="Type a message..." autocomplete="off">
                    <button class="btn" type="submit" id="send-btn">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                    <button type="button" class="btn" id="record-btn" style="display:none;">
                        <i class="fa-solid fa-microphone"></i>
                    </button>
                </form>
            `;
            container.appendChild(sendArea);

            const closeBtn = container.querySelector('#chat-widget-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    closeChat();
                });
            }

            return container;
        }

        function injectChatWidget() {
            if (loadingEl) loadingEl.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = 'flex';
                placeholder.innerHTML = '';
                const widget = buildChatWidget();
                placeholder.appendChild(widget);
            }

            // Initialize chat with user
            const user = window.getCurrentUser ? window.getCurrentUser() : null;
            if (user && user.id && window.initializeChat) {
                setTimeout(() => {
                    window.initializeChat(user);
                }, 200);
            }
        }

        // Open/Close functions
        window.openChat = function() {
            if (fabContainer) {
                fabContainer.classList.add('fab-hidden');
            }
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.classList.add('open');
            }
            if (placeholder && placeholder.children.length === 0) {
                injectChatWidget();
            }
            if (loadingEl) loadingEl.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        };

        window.closeChat = function(event) {
            if (event && event.target !== event.currentTarget) return;
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('open');
            }
            if (fabContainer) {
                fabContainer.classList.remove('fab-hidden');
            }
            const notif = document.getElementById('chatNotification');
            if (notif) notif.classList.remove('active');
        };

        window.toggleChat = function() {
            if (overlay && overlay.classList.contains('open')) {
                window.closeChat();
            } else {
                window.openChat();
            }
        };

        // Event listeners
        if (fab) {
            fab.addEventListener('click', function(e) {
                e.stopPropagation();
                window.toggleChat();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) window.closeChat();
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
                window.closeChat();
            }
        });

        // Add CSS for animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin { to { transform: rotate(360deg); } }
            .fab-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: scale(0.8) !important;
            }
            #chat-modal-overlay.open {
                display: flex !important;
            }
            .chat-fab:hover {
                transform: scale(1.06);
                box-shadow: 0 10px 36px rgba(108,77,255,0.6);
            }
        `;
        document.head.appendChild(style);

        isLoaded = true;
        console.log('✅ Chatbox loaded successfully!');
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChat);
    } else {
        loadChat();
    }
})();