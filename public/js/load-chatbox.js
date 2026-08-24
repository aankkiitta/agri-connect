// public/js/load-chatbox.js
(function() {
    "use strict";

    let isLoaded = false;
    let chatIframe = null;
    let isChatOpen = false;

    // Icon size (small floating button area)
    const ICON_WIDTH = 72;
    const ICON_HEIGHT = 72;
    const ICON_BOTTOM = 24;
    const ICON_RIGHT = 24;

    // Chat window sizes
    const CHAT_WIDTH_DESKTOP = 440;
    const CHAT_HEIGHT_DESKTOP = 620;
    const CHAT_WIDTH_MOBILE = '94vw';
    const CHAT_HEIGHT_MOBILE = '88vh';

    function isMobile() {
        return window.innerWidth <= 768;
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
            isChatOpen = true;
        } else {
            // Shrink to icon size
            chatIframe.style.width = ICON_WIDTH + 'px';
            chatIframe.style.height = ICON_HEIGHT + 'px';
            chatIframe.style.bottom = ICON_BOTTOM + 'px';
            chatIframe.style.right = ICON_RIGHT + 'px';
            chatIframe.style.borderRadius = '50%';
            chatIframe.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            chatIframe.style.pointerEvents = 'auto';
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
            width: auto;
            height: auto;
            pointer-events: none;
            z-index: 999999;
            overflow: visible;
        `;

        // Create iframe
        chatIframe = document.createElement('iframe');
        chatIframe.src = '/chat.html';
        chatIframe.style.cssText = `
            position: fixed;
            bottom: ${ICON_BOTTOM}px;
            right: ${ICON_RIGHT}px;
            width: ${ICON_WIDTH}px;
            height: ${ICON_HEIGHT}px;
            border: none;
            pointer-events: auto;
            z-index: 999999;
            background: transparent;
            border-radius: 50%;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
        `;
        chatIframe.allow = 'fullscreen';

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
        window.addEventListener('resize', function() {
            if (isChatOpen) {
                setIframeSize(true);
            }
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