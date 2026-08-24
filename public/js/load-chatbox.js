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

                // --- 1. Extract and inject CSS with unique IDs ---
                const styles = doc.querySelectorAll('style');
                styles.forEach((style, index) => {
                    const styleHash = 'chat_' + index + '_' + style.textContent.substring(0, 50).replace(/\s/g, '');
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
                let fabContainer = doc.getElementById('chat-fab-container');
                let modalOverlay = doc.getElementById('chat-modal-overlay');

                if (!fabContainer || !modalOverlay) {
                    throw new Error('Could not find chat elements in chat.html');
                }

                // Clone the elements to avoid reference issues
                fabContainer = fabContainer.cloneNode(true);
                modalOverlay = modalOverlay.cloneNode(true);

                // --- 3. Setup container ---
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

                // --- 4. Fix FAB container styles ---
                fabContainer.style.cssText = `
                    position: fixed !important;
                    bottom: 28px !important;
                    right: 28px !important;
                    z-index: 1000000 !important;
                    pointer-events: auto !important;
                    transition: opacity 0.25s ease, transform 0.25s ease !important;
                    display: block !important;
                `;

                // Make sure FAB is visible
                const fab = fabContainer.querySelector('.chat-fab');
                if (fab) {
                    fab.style.cssText = `
                        width: 62px !important;
                        height: 62px !important;
                        border-radius: 50% !important;
                        background: linear-gradient(135deg, #6C4DFF, #8B5CFF) !important;
                        color: white !important;
                        border: none !important;
                        box-shadow: 0 8px 28px rgba(108, 77, 255, 0.45) !important;
                        cursor: pointer !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        position: relative !important;
                    `;
                }

                // --- 5. Fix Modal overlay styles ---
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
                    animation: fadeIn 0.25s ease !important;
                    padding: 16px !important;
                    pointer-events: auto !important;
                `;

                // --- 6. Append to container ---
                container.appendChild(fabContainer);
                container.appendChild(modalOverlay);

                // --- 7. Load Socket.IO if needed ---
                if (typeof io === 'undefined') {
                    const socketScript = document.createElement('script');
                    socketScript.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
                    document.head.appendChild(socketScript);
                }

                // --- 8. Execute the chat logic ---
                // Get the inline script from chat.html
                const scripts = doc.querySelectorAll('script:not([src])');
                let chatScriptContent = '';
                scripts.forEach(script => {
                    const content = script.textContent;
                    if (content.includes('chat-fab-container') && 
                        content.includes('chat-modal-overlay')) {
                        chatScriptContent = content;
                    }
                });

                if (chatScriptContent) {
                    // Create a new script with the chat logic but with fixes
                    const newScript = document.createElement('script');
                    newScript.textContent = `
                        (function() {
                            // Override getCurrentUser to work in any context
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
                                    return { id: 1, email: 'demo@kisan.in', name: 'Demo Farmer' };
                                } catch (e) {
                                    return { id: 1, email: 'demo@kisan.in', name: 'Demo Farmer' };
                                }
                            };

                            // Get elements
                            const fabContainer = document.getElementById('chat-fab-container');
                            const fab = document.getElementById('chat-fab');
                            const overlay = document.getElementById('chat-modal-overlay');
                            const modal = document.getElementById('chat-modal');
                            const placeholder = document.getElementById('chat-widget-placeholder');
                            const loadingEl = document.getElementById('chat-loading');

                            if (!fabContainer || !fab || !overlay) {
                                console.warn('⚠️ Chat elements not found in DOM');
                                return;
                            }

                            // Show FAB
                            fabContainer.classList.remove('fab-hidden');

                            // Build chat widget function
                            function buildChatWidget() {
                                const container = document.createElement('div');
                                container.id = 'chat-widget-container';
                                container.style.cssText = 'width:100%; height:100%; display:flex; flex-direction:column; background:transparent; overflow:hidden;';

                                const nav = document.createElement('nav');
                                nav.innerHTML = \`
                                    <h1>💬 KISAN CIRCLE</h1>
                                    <div id="user-count-container">
                                        <span id="user-count-dot"></span>
                                        <span id="user-count-text">0 Online</span>
                                    </div>
                                    <button id="chat-widget-close" aria-label="Close chat">&times;</button>
                                \`;
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
                                sendArea.innerHTML = \`
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
                                \`;
                                container.appendChild(sendArea);

                                const closeBtn = container.querySelector('#chat-widget-close');
                                if (closeBtn) {
                                    closeBtn.addEventListener('click', function(e) {
                                        e.stopPropagation();
                                        window.closeChat();
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

                                const user = window.getCurrentUser();
                                if (user && user.id) {
                                    if (!window._chatScriptLoaded) {
                                        const script = document.createElement('script');
                                        script.src = '/js/chat.js';
                                        script.onload = function() {
                                            console.log('✅ chat.js loaded');
                                            if (window.initializeChat) {
                                                window.initializeChat(user);
                                            }
                                        };
                                        document.body.appendChild(script);
                                        window._chatScriptLoaded = true;
                                    } else if (window.initializeChat) {
                                        window.initializeChat(user);
                                    }
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

                            // Add event listeners
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

                            // Ensure FAB is visible
                            if (fabContainer) {
                                fabContainer.classList.remove('fab-hidden');
                            }

                            console.log('✅ KISAN CIRCLE Chat loaded successfully!');
                        })();
                    `;
                    newScript.setAttribute('data-chat-loader', 'true');
                    document.body.appendChild(newScript);
                }

                // --- 9. Load chat.js ---
                if (!document.querySelector('script[src*="chat.js"]') && !window.chatJsLoaded) {
                    const chatJs = document.createElement('script');
                    chatJs.src = '/js/chat.js';
                    chatJs.onload = function() {
                        console.log('✅ chat.js loaded');
                        window.chatJsLoaded = true;
                    };
                    chatJs.onerror = function() {
                        console.warn('⚠️ chat.js not found');
                    };
                    document.body.appendChild(chatJs);
                }

                isLoaded = true;
                container.classList.add('loaded');
                console.log('✅ Chatbox loaded successfully!');

                // Force FAB to show
                setTimeout(() => {
                    const fabEl = document.getElementById('chat-fab-container');
                    if (fabEl) {
                        fabEl.classList.remove('fab-hidden');
                        fabEl.style.display = 'block !important';
                        fabEl.style.visibility = 'visible !important';
                        fabEl.style.opacity = '1 !important';
                    }
                }, 500);

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