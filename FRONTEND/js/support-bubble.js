/**
 * Customer Support Floating Bubble - Include on all pages
 * Redirects users to customer support page
 */
(function() {
    const supportBubbleStyles = `
        .support-floating-bubble {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            box-shadow: 0 4px 20px rgba(37, 211, 102, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9998;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            text-decoration: none;
            color: white;
            border: 3px solid rgba(255,255,255,0.3);
        }
        .support-floating-bubble:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 25px rgba(37, 211, 102, 0.6);
        }
        .support-floating-bubble:active {
            transform: scale(0.95);
        }
        .support-floating-bubble i {
            font-size: 28px;
        }
        .support-floating-bubble .support-tooltip {
            position: absolute;
            right: 70px;
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 14px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .support-floating-bubble:hover .support-tooltip {
            opacity: 1;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = supportBubbleStyles;
    document.head.appendChild(styleEl);

    const supportUrl = window.location.pathname.includes('admin') ? 'admin-support.html' : 'support.html';
    
    const bubble = document.createElement('a');
    bubble.className = 'support-floating-bubble';
    bubble.href = supportUrl;
    bubble.title = 'Customer Support';
    bubble.innerHTML = '<i class="fas fa-headset"></i><span class="support-tooltip">Need help? Chat with us</span>';
    bubble.setAttribute('aria-label', 'Customer Support');

    document.body.appendChild(bubble);
})();
