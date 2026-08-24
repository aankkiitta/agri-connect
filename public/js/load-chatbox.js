// public/js/load-chatbox.js
(function() {
    "use strict";

    let isLoaded = false;
    let chatIframe = null;
    let isChatOpen = false;
    let isUserLoggedIn = false;

    // Icon size (small floating button area)
    const ICON_WIDTH = 60;
    const ICON_HEIGHT = 60;
    const ICON_BOTTOM = 24;
    const ICON_RIGHT = 24;

    // Mobile icon size
    const ICON_WIDTH_MOBILE = 52;
    const ICON_HEIGHT_MOBILE = 52;
    const ICON_BOTTOM_MOBILE = 18;
    const ICON_RIGHT_MOBILE = 18;

    // Chat window sizes
    const CHAT_WIDTH_DESKTOP = 440;
    const CHAT_HEIGHT_DESKTOP = 620;
    const CHAT_WIDTH_MOBILE = '94vw';
    const CHAT_HEIGHT_MOBILE = '88vh';

    // ===== AUTHENTICATION CHECK =====
    function checkUserAuthentication() {
        try {
            // Check multiple possible storage keys for user data
            const keys = ['agriUser', 'user', 'userData', 'authUser'];
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const user = JSON.parse(data);
                        const userId = user.id || user.user_id || user.userId || user._id || null;
                        if (userId) {
                            console.log('✅ User authenticated:', user.name || 'User');
                            return true;
                        }
                    } catch (_) {}
                }
            }
            
            // Also check sessionStorage
            const sessionData = sessionStorage.getItem('user');
            if (sessionData) {
                try {
                    const user = JSON.parse(sessionData);
                    const userId = user.id || user.user_id || user.userId || user._id || null;
                    if (userId) {
                        console.log('✅ User authenticated (session):', user.name || 'User');
                        return true;
                    }
                } catch (_) {}
            }
            
            // Check for auth token
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (token) {
                console.log('✅ Auth token found');
                return true;
            }
            
            console.log('❌ No authenticated user found');
            return false;
        } catch (e) {
            console.warn('⚠️ Auth check error:', e);
            return false;
        }
    }

    function getCurrentUser() {
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
                    } catch (_) {}
                }
            }
            return null;
        } catch (_) {
            return null;
        }
    }

    function isMobile() {
        return window.innerWidth <= 768;
    }

    function getIconDimensions() {
        if (isMobile()) {
            return {
                width: ICON_WIDTH_MOBILE,
                height: ICON_HEIGHT_MOBILE,
                bottom: ICON_BOTTOM_MOBILE,
                right: ICON_RIGHT_MOBILE
            };
        }
        return {
            width: ICON_WIDTH,
            height: ICON_HEIGHT,
            bottom: ICON_BOTTOM,
            right: ICON_RIGHT
        };
    }

    function getChatDimensions() {
        if (isMobile()) {
            return {
                width: CHAT_WIDTH_MOBILE,
                height: CHAT_HEIGHT_MOBILE,
                bottom: '1vh',
                right: '3vw'
            };
        }
        return {
            width: CHAT_WIDTH_DESKTOP + 'px',
            height: CHAT_HEIGHT_DESKTOP + 'px',
            bottom: '20px',
            right: '20px'
        };
    }

    function injectFixedStyles(iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.textContent = `
            .in-iframe #chat-fab-container {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                bottom: auto !important;
                right: auto !important;
                pointer-events: none !important;
                background: transparent !important;
            }
            
            .in-iframe #chat-fab-container .chat-fab {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
                border-radius: 50% !important;
                aspect-ratio: 1 / 1 !important;
                pointer-events: auto !important;
                flex-shrink: 0 !important;
                min-width: 0 !important;
                min-height: 0 !important;
                max-width: none !important;
                max-height: none !important;
                box-shadow: 0 8px 28px rgba(108, 77, 255, 0.45) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .in-iframe #chat-fab-container .chat-fab i {
                font-size: 26px !important;
                line-height: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            @media (max-width: 480px) {
                .in-iframe #chat-fab-container .chat-fab i {
                    font-size: 22px !important;
                }
            }
            
            .in-iframe .chat-modal-overlay {
                z-index: 1000000 !important;
            }
            
            .in-iframe body {
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
            }
            
            .in-iframe .fab-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: scale(0.8) !important;
            }
        `;
        iframeDoc.head.appendChild(style);
    }

    function setIframeSize(open) {
        if (!chatIframe) return;

        if (open) {
            const dims = getChatDimensions();
            chatIframe.style.width = dims.width;
            chatIframe.style.height = dims.height;
            chatIframe.style.bottom = dims.bottom;
            chatIframe.style.right = dims.right;
            chatIframe.style.borderRadius = '16px';
            chatIframe.style.boxShadow = '0 10px 40px rgba(0,0,0,0.25)';
            chatIframe.style.pointerEvents = 'auto';
            chatIframe.style.background = 'transparent';
            chatIframe.style.border = 'none';
            chatIframe.style.overflow = 'visible';
            isChatOpen = true;
        } else {
            const dims = getIconDimensions();
            chatIframe.style.width = dims.width + 'px';
            chatIframe.style.height = dims.height + 'px';
            chatIframe.style.bottom = dims.bottom + 'px';
            chatIframe.style.right = dims.right + 'px';
            chatIframe.style.borderRadius = '50%';
            chatIframe.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            chatIframe.style.pointerEvents = 'auto';
            chatIframe.style.background = 'transparent';
            chatIframe.style.border = 'none';
            chatIframe.style.overflow = 'hidden';
            isChatOpen = false;
        }
    }

    function loadChat() {
        // ===== AUTHENTICATION CHECK =====
        if (!checkUserAuthentication()) {
            console.log('🔒 User not logged in - chatbox disabled');
            hideChatbox();
            return;
        }

        if (isLoaded) {
            showChatbox();
            return;
        }

        const container = document.getElementById('chatbox-container');
        if (!container) {
            console.error('❌ #chatbox-container not found!');
            return;
        }

        console.log('🔄 Loading chat via iframe...');

        container.innerHTML = '';
        container.style.cssText = `
            position: fixed;
            bottom: 0;
            right: 0;
            width: 0;
            height: 0;
            pointer-events: none;
            z-index: 999999;
            overflow: visible;
            margin: 0;
            padding: 0;
        `;

        chatIframe = document.createElement('iframe');
        chatIframe.src = '/chat.html';
        
        const iconDims = getIconDimensions();
        chatIframe.style.cssText = `
            position: fixed;
            bottom: ${iconDims.bottom}px;
            right: ${iconDims.right}px;
            width: ${iconDims.width}px;
            height: ${iconDims.height}px;
            border: none;
            pointer-events: auto;
            z-index: 999999;
            background: transparent;
            border-radius: 50%;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        `;
        chatIframe.allow = 'fullscreen';
        chatIframe.scrolling = 'no';
        chatIframe.frameBorder = '0';

        container.appendChild(chatIframe);

        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'chatbox-toggle') {
                const isOpen = event.data.isOpen;
                setIframeSize(isOpen);
                console.log(`📨 Chatbox ${isOpen ? 'opened' : 'closed'}`);
            }
        });

        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                if (isChatOpen) {
                    setIframeSize(true);
                } else {
                    const dims = getIconDimensions();
                    if (chatIframe) {
                        chatIframe.style.width = dims.width + 'px';
                        chatIframe.style.height = dims.height + 'px';
                        chatIframe.style.bottom = dims.bottom + 'px';
                        chatIframe.style.right = dims.right + 'px';
                    }
                }
            }, 150);
        });

        chatIframe.onload = function() {
            console.log('✅ Chat iframe loaded successfully!');
            isLoaded = true;
            
            try {
                const iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow.document;
                if (iframeDoc) {
                    injectFixedStyles(iframeDoc);
                    console.log('✅ Injected style fixes into iframe');
                }
            } catch (e) {
                console.warn('⚠️ Could not inject styles into iframe (cross-origin?)', e);
            }
            
            try {
                chatIframe.contentWindow.postMessage({ type: 'chatbox-state', isOpen: false }, '*');
            } catch (e) {}
        };

        console.log('✅ Chat iframe created!');
        showChatbox();
    }

    function hideChatbox() {
        const container = document.getElementById('chatbox-container');
        if (container) {
            container.style.display = 'none';
        }
        isLoaded = false;
        chatIframe = null;
        isChatOpen = false;
    }

    function showChatbox() {
        const container = document.getElementById('chatbox-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    function destroyChatbox() {
        const container = document.getElementById('chatbox-container');
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
        isLoaded = false;
        chatIframe = null;
        isChatOpen = false;
        console.log('🗑️ Chatbox destroyed');
    }

    // ===== MONITOR AUTHENTICATION STATE CHANGES =====
    function monitorAuthChanges() {
        let lastAuthState = checkUserAuthentication();
        
        setInterval(() => {
            const currentAuthState = checkUserAuthentication();
            if (currentAuthState !== lastAuthState) {
                console.log(`🔄 Auth state changed: ${lastAuthState} → ${currentAuthState}`);
                lastAuthState = currentAuthState;
                
                if (currentAuthState) {
                    // User logged in - load chat
                    loadChat();
                } else {
                    // User logged out - destroy chat
                    destroyChatbox();
                }
            }
        }, 2000); // Check every 2 seconds
    }

    // ===== INITIALIZATION =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (checkUserAuthentication()) {
                loadChat();
            } else {
                console.log('🔒 User not logged in - chatbox disabled');
                hideChatbox();
            }
            monitorAuthChanges();
        });
    } else {
        if (checkUserAuthentication()) {
            loadChat();
        } else {
            console.log('🔒 User not logged in - chatbox disabled');
            hideChatbox();
        }
        monitorAuthChanges();
    }

    // ===== EXPOSE FOR DEBUGGING =====
    window.__chatbox = {
        loadChat,
        hideChatbox,
        destroyChatbox,
        checkAuth: checkUserAuthentication,
        getUser: getCurrentUser
    };
})();