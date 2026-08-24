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

        console.log('🔄 Loading chat via iframe...');

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

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = '/chat.html';
        iframe.style.cssText = `
            position: fixed;
            bottom: 0;
            right: 0;
            width: 100%;
            height: 100%;
            border: none;
            pointer-events: auto;
            z-index: 999999;
            background: transparent;
        `;
        
        // Allow pointer events on iframe content
        iframe.allow = 'fullscreen';
        
        container.appendChild(iframe);

        // Log when loaded
        iframe.onload = function() {
            console.log('✅ Chat iframe loaded successfully!');
            isLoaded = true;
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