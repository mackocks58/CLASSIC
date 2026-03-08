/**
 * Customer Support Chat - Uses Backend API
 */
const firebaseConfig = {
    apiKey: "AIzaSyAIX3aQq3VEBq269Jdrk77CefNttqAR51s",
    authDomain: "mozambique-newhope.firebaseapp.com",
    databaseURL: "https://mozambique-newhope-default-rtdb.firebaseio.com",
    projectId: "mozambique-newhope",
    storageBucket: "mozambique-newhope.firebasestorage.app",
    messagingSenderId: "133563964959",
    appId: "1:133563964959:web:d3f183b721d540140f7f2a",
    measurementId: "G-FY6CNVX6ZK"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let userId = null;
let userPhone = '';

const messagesContainer = document.getElementById('messagesContainer');
const emptyState = document.getElementById('emptyState');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const inputArea = document.getElementById('inputArea');
const loginPrompt = document.getElementById('loginPrompt');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiSpans = emojiPicker.querySelectorAll('.emoji');

function formatTime(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMessage(msg) {
    const isUser = msg.senderType === 'user';
    const div = document.createElement('div');
    div.className = 'message ' + (isUser ? 'user-msg' : 'admin-msg');
    let html = '';
    if (!isUser && msg.senderName) {
        html += '<div class="message-sender">' + escapeHtml(msg.senderName) + '</div>';
    }
    html += '<div class="message-bubble">' + escapeHtml(msg.text || '') + '</div>';
    html += '<div class="message-time">' + formatTime(msg.timestamp) + '</div>';
    div.innerHTML = html;
    return div;
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}

async function loadMessages() {
    if (!userId) return;
    
    try {
        let messages = [];
        
        // Try API first
        if (window.ClassicAPI) {
            try {
                messages = await ClassicAPI.support.messages();
                console.log('Messages loaded from API:', messages);
            } catch (apiErr) {
                console.error('API error loading messages:', apiErr);
                // Fallback to Firebase if API fails
                const database = firebase.database();
                const snap = await database.ref(`supportChats/${userId}/messages`).once('value');
                if (snap.exists()) {
                    snap.forEach(c => messages.push({ id: c.key, ...c.val() }));
                }
            }
        } else {
            // Fallback to Firebase
            const database = firebase.database();
            const snap = await database.ref(`supportChats/${userId}/messages`).once('value');
            if (snap.exists()) {
                snap.forEach(c => messages.push({ id: c.key, ...c.val() }));
            }
        }
        
        // Sort by timestamp
        messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        messagesContainer.innerHTML = '';
        if (messages && messages.length > 0) {
            emptyState.style.display = 'none';
            messages.forEach(msg => {
                console.log('Rendering message:', msg);
                messagesContainer.appendChild(renderMessage(msg));
            });
            scrollToBottom();
        } else {
            emptyState.style.display = 'block';
        }
    } catch (e) {
        console.error('Error loading messages:', e);
        emptyState.style.display = 'block';
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !userId) return;

    // Immediately disable button and clear input
    sendBtn.disabled = true;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    emojiPicker.classList.remove('show');
    
    try {
        if (window.ClassicAPI) {
            await ClassicAPI.support.send(text);
        } else {
            const database = firebase.database();
            const ref = database.ref('supportChats/' + userId + '/messages').push();
            await ref.set({
                text,
                senderType: 'user',
                senderId: userId,
                senderName: userPhone || 'User',
                timestamp: Date.now(),
                read: false
            });
            await database.ref('supportChats/' + userId).update({
                lastMessage: text,
                lastMessageTime: Date.now(),
                userPhone: userPhone || 'Unknown',
                updatedAt: Date.now()
            });
        }
        // Load messages after sending
        await loadMessages();
    } catch (e) {
        console.error('Send error:', e);
        messageInput.value = text; // Restore message if sending failed
    } finally {
        sendBtn.disabled = false;
    }
}

messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Emoji picker functionality
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('show');
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#emojiBtn') && !e.target.closest('.emoji-picker')) {
        emojiPicker.classList.remove('show');
    }
});

// Add emoji to input when clicked
emojiSpans.forEach(emoji => {
    emoji.addEventListener('click', () => {
        messageInput.value += emoji.textContent;
        messageInput.focus();
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    });
});

sendBtn.addEventListener('click', sendMessage);

auth.onAuthStateChanged(async (user) => {
    if (user) {
        userId = user.uid;
        loginPrompt.style.display = 'none';
        inputArea.style.display = 'flex';

        if (window.ClassicAPI) {
            try {
                const u = await ClassicAPI.users.me();
                userPhone = u.phone || user.email || 'User';
            } catch (_) {}
        } else {
            try {
                const userSnap = await firebase.database().ref('users/' + userId).once('value');
                if (userSnap.exists()) userPhone = userSnap.val().phone || 'User';
            } catch (_) {}
        }

        // Load messages immediately
        await loadMessages();
        
        // Start auto-refresh every 5 seconds
        const refreshInterval = setInterval(async () => {
            if (userId) {
                await loadMessages();
            } else {
                clearInterval(refreshInterval);
            }
        }, 5000);
    } else {
        userId = null;
        loginPrompt.style.display = 'block';
        inputArea.style.display = 'none';
        emptyState.style.display = 'block';
        messagesContainer.innerHTML = '';
    }
});
