// public/js/load-chatbox.js
(function() {
    "use strict";

    let isLoaded = false;
    let chatIframe = null;
    let isChatOpen = false;

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
            // Shrink to icon size - perfect circle
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
        if (isLoaded) return;

        const container = document.getElementById('chatbox-container');
        if (!container) {
            console.error('❌ #chatbox-container not found!');
            return;
        }

        console.log('🔄 Loading chat via iframe...');

        // Clear and style container — it acts as a wrapper but iframe is fixed
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

        // Create iframe
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

        // Listen for postMessage from chat.html
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'chatbox-toggle') {
                const isOpen = event.data.isOpen;
                setIframeSize(isOpen);
                console.log(`📨 Chatbox ${isOpen ? 'opened' : 'closed'}`);
            }
        });

        // Handle resize events to adjust chat dimensions on the fly (for mobile/desktop switch)
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                if (isChatOpen) {
                    setIframeSize(true);
                } else {
                    // Update icon size on resize
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
            // Send initial state to chat.html so it knows it starts closed
            try {
                chatIframe.contentWindow.postMessage({ type: 'chatbox-state', isOpen: false }, '*');
            } catch (e) {
                // ignore
            }
        };

        console.log('✅ Chat iframe created!');
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChat);
    } else {
        loadChat();
    }
})();