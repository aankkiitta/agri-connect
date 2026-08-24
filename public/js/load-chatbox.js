// public/js/load-chatbox.js
(function() {
    "use strict";

    let isLoaded = false;

    window.__loadChatbox = function(containerElement) {
        if (isLoaded) return;
        
        const container = containerElement || document.getElementById('chatbox-container');
        if (!container) {
            console.error('❌ #chatbox-container not found!');
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; gap:12px; padding:20px; color:#8888aa; font-family:system-ui;">
                <i class="fas fa-spinner fa-pulse" style="color:#6C4DFF;"></i>
                <span>Loading chat...</span>
            </div>
        `;

        // Fetch chat.html
        fetch('/chat.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // --- 1. Extract and inject CSS ---
                const styles = doc.querySelectorAll('style');
                styles.forEach(style => {
                    const styleHash = style.textContent.substring(0, 100);
                    const existingStyle = document.querySelector(`style[data-chat-hash="${styleHash}"]`);
                    if (!existingStyle) {
                        const newStyle = document.createElement('style');
                        newStyle.textContent = style.textContent;
                        newStyle.setAttribute('data-chat', 'true');
                        newStyle.setAttribute('data-chat-hash', styleHash);
                        document.head.appendChild(newStyle);
                    }
                });

                // --- 2. Extract FAB and Modal ---
                const fabContainer = doc.getElementById('chat-fab-container');
                const modalOverlay = doc.getElementById('chat-modal-overlay');

                if (!fabContainer || !modalOverlay) {
                    throw new Error('Could not find chat elements in chat.html');
                }

                // CRITICAL FIX: Setup container to allow interaction
                container.innerHTML = '';
                container.style.position = 'fixed';
                container.style.bottom = '0';
                container.style.right = '0';
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.pointerEvents = 'none'; // Container doesn't block clicks
                container.style.zIndex = '9999';
                container.style.overflow = 'visible';

                // CRITICAL FIX: Make FAB clickable by setting pointer-events: auto
                fabContainer.style.pointerEvents = 'auto';
                fabContainer.style.position = 'fixed';
                fabContainer.style.bottom = '28px';
                fabContainer.style.right = '28px';
                fabContainer.style.zIndex = '10000';

                // CRITICAL FIX: Modal overlay should also be clickable
                modalOverlay.style.pointerEvents = 'auto';
                modalOverlay.style.position = 'fixed';
                modalOverlay.style.top = '0';
                modalOverlay.style.left = '0';
                modalOverlay.style.width = '100%';
                modalOverlay.style.height = '100%';
                modalOverlay.style.zIndex = '10001';

                container.appendChild(fabContainer);
                container.appendChild(modalOverlay);

                // --- 3. Load Socket.IO if needed ---
                if (typeof io === 'undefined') {
                    const socketScript = document.createElement('script');
                    socketScript.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
                    document.head.appendChild(socketScript);
                }

                // --- 4. Execute inline chat script from chat.html ---
                const scripts = doc.querySelectorAll('script:not([src])');
                let chatScript = null;
                scripts.forEach(script => {
                    const content = script.textContent;
                    if (content.includes('chat-fab-container') && 
                        content.includes('chat-modal-overlay') &&
                        content.includes('toggleChat')) {
                        chatScript = script;
                    }
                });

                if (chatScript) {
                    const newScript = document.createElement('script');
                    newScript.textContent = `
                        (function() {
                            ${chatScript.textContent}
                            
                            // Ensure getCurrentUser is available
                            if (typeof window.getCurrentUser === 'undefined') {
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
                                    } catch (e) {
                                        return null;
                                    }
                                };
                            }
                            
                            // After script executes, make sure FAB is visible
                            setTimeout(function() {
                                const fabContainer = document.getElementById('chat-fab-container');
                                if (fabContainer) {
                                    fabContainer.classList.remove('fab-hidden');
                                }
                            }, 100);
                        })();
                    `;
                    newScript.setAttribute('data-chat-loader', 'true');
                    document.body.appendChild(newScript);
                }

                // --- 5. Load chat.js for Socket.IO logic ---
                if (!document.querySelector('script[src*="chat.js"]')) {
                    const chatJs = document.createElement('script');
                    chatJs.src = '/js/chat.js';
                    chatJs.onload = function() {
                        console.log('✅ chat.js loaded');
                    };
                    document.body.appendChild(chatJs);
                }

                isLoaded = true;
                container.classList.add('loaded');
                console.log('✅ Chatbox loaded successfully!');

            })
            .catch(error => {
                console.error('❌ Failed to load chatbox:', error);
                container.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:center; gap:12px; padding:30px; color:#ff4444; font-family:system-ui; background:#fff5f5; border-radius:12px;">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Failed to load chat. Please try again.</span>
                    </div>
                `;
            });
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('chatbox-container');
            if (container) {
                window.__loadChatbox(container);
            }
        });
    } else {
        const container = document.getElementById('chatbox-container');
        if (container) {
            window.__loadChatbox(container);
        }
    }
})();