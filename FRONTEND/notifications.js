// Firebase Configuration
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

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const database = firebase.database();

        // DOM Elements
        const loadingOverlay = document.getElementById('loadingOverlay');
        const notificationBell = document.getElementById('notificationBell');
        const notificationBadge = document.getElementById('notificationBadge');
        const notificationDropdown = document.getElementById('notificationDropdown');
        const notificationDropdownBody = document.getElementById('notificationDropdownBody');
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        const viewAllNotifications = document.getElementById('viewAllNotifications');
        const userName = document.getElementById('userName');
        const userPhone = document.getElementById('userPhone');
        const logoutBtn = document.getElementById('logoutBtn');
        const sidebar = document.getElementById('sidebar');
        
        // Stats Elements
        const totalNotifications = document.getElementById('totalNotifications');
        const unreadNotifications = document.getElementById('unreadNotifications');
        const readNotifications = document.getElementById('readNotifications');
        
        // Main Content Elements
        const notificationsGrid = document.getElementById('notificationsGrid');
        const filterButtons = document.querySelectorAll('.filter-btn');

        // State Variables
        let currentUser = null;
        let userId = null;
        let allNotifications = [];
        let currentFilter = 'all';

        // Function to show/hide loading
        function showLoading(show) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }

        // Function to format date
        function formatDate(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            // If less than 1 minute
            if (diff < 60000) {
                return 'Just now';
            }
            
            // If less than 1 hour
            if (diff < 3600000) {
                const minutes = Math.floor(diff / 60000);
                return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            }
            
            // If less than 1 day
            if (diff < 86400000) {
                const hours = Math.floor(diff / 3600000);
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            }
            
            // If less than 1 week
            if (diff < 604800000) {
                const days = Math.floor(diff / 86400000);
                return `${days} day${days > 1 ? 's' : ''} ago`;
            }
            
            // Return full date
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Function to check if user should receive announcement
        function shouldUserReceiveAnnouncement(announcement, userId) {
            const target = announcement.target;
            
            // Check if announcement is for all users
            if (target.type === 'all') {
                return true;
            }
            
            // Check if announcement is for specific users
            if (target.type === 'specific' && Array.isArray(target.value)) {
                return target.value.includes(userId);
            }
            
            return false;
        }

        // Function to get notification type and class
        function getNotificationType(notification) {
            if (notification.type === 'withdrawal') {
                switch(notification.action) {
                    case 'approve': return 'withdrawal-approve';
                    case 'reject': return 'withdrawal-reject';
                    case 'delete': return 'withdrawal-delete';
                    default: return 'withdrawal-approve';
                }
            } else if (notification.type === 'announcement') {
                return 'announcement';
            }
            return 'announcement';
        }

        // Function to get notification type display name
        function getNotificationTypeDisplay(notification) {
            if (notification.type === 'withdrawal') {
                switch(notification.action) {
                    case 'approve': return 'Withdrawal Approved';
                    case 'reject': return 'Withdrawal Rejected';
                    case 'delete': return 'Withdrawal Deleted';
                    default: return 'Withdrawal Update';
                }
            } else if (notification.type === 'announcement') {
                return 'Announcement';
            }
            return 'Notification';
        }

        // Function to load user notifications from all sources
        async function loadUserNotifications() {
            try {
                showLoading(true);
                userId = currentUser.uid;
                
                // Load user's read announcements
                const readSnapshot = await database.ref(`userReadAnnouncements/${userId}`).once('value');
                const readAnnouncements = readSnapshot.exists() ? readSnapshot.val() : {};
                
                // Load all announcements
                const announcementsSnapshot = await database.ref('announcements').once('value');
                const announcements = [];
                
                if (announcementsSnapshot.exists()) {
                    announcementsSnapshot.forEach(childSnapshot => {
                        const announcement = childSnapshot.val();
                        announcement.id = childSnapshot.key;
                        
                        // Check if user should see this announcement
                        if (shouldUserReceiveAnnouncement(announcement, userId)) {
                            // Check if user has read this announcement
                            const isRead = readAnnouncements[announcement.id] === true || 
                                         (readAnnouncements[announcement.id] && readAnnouncements[announcement.id].read === true);
                            
                            announcement.read = isRead;
                            announcement.readTime = readAnnouncements[announcement.id] ? 
                                                  readAnnouncements[announcement.id].timestamp : null;
                            announcement.type = 'announcement';
                            
                            announcements.push(announcement);
                        }
                    });
                }
                
                // Load user notifications (withdrawal notifications)
                const userNotificationsSnapshot = await database.ref(`userNotifications/${userId}`).once('value');
                const userNotifications = [];
                
                if (userNotificationsSnapshot.exists()) {
                    userNotificationsSnapshot.forEach(childSnapshot => {
                        const notification = childSnapshot.val();
                        notification.id = childSnapshot.key;
                        notification.type = 'withdrawal';
                        
                        userNotifications.push(notification);
                    });
                }
                
                // Combine all notifications
                allNotifications = [...announcements, ...userNotifications];
                
                // Sort by timestamp (newest first)
                allNotifications.sort((a, b) => b.timestamp - a.timestamp);
                
                // Update stats
                updateNotificationStats();
                
                // Render notifications
                renderNotifications();
                renderNotificationDropdown();
                
                showLoading(false);
                
            } catch (error) {
                console.error('Error loading notifications:', error);
                showLoading(false);
                showErrorMessage('Failed to load notifications');
            }
        }

        // Function to update notification stats
        function updateNotificationStats() {
            const total = allNotifications.length;
            const unread = allNotifications.filter(n => !n.read).length;
            const read = total - unread;
            
            // Update sidebar stats
            totalNotifications.textContent = total;
            unreadNotifications.textContent = unread;
            readNotifications.textContent = read;
            
            // Update notification badge
            notificationBadge.textContent = unread;
            
            // Show/hide badge
            if (unread > 0) {
                notificationBadge.style.display = 'flex';
            } else {
                notificationBadge.style.display = 'none';
            }
        }

        // Function to mark notification as read
        async function markAsRead(notificationId, type) {
            try {
                const notification = allNotifications.find(n => n.id === notificationId);
                if (!notification || notification.read) return;
                
                if (type === 'announcement') {
                    // Update in Firebase
                    await database.ref(`userReadAnnouncements/${userId}/${notificationId}`).set({
                        read: true,
                        timestamp: Date.now()
                    });
                } else if (type === 'withdrawal') {
                    // Update in Firebase
                    await database.ref(`userNotifications/${userId}/${notificationId}/read`).set(true);
                }
                
                // Update local state
                notification.read = true;
                notification.readTime = Date.now();
                
                // Update UI
                updateNotificationStats();
                renderNotifications();
                renderNotificationDropdown();
                
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }

        // Function to mark all as read
        async function markAllAsRead() {
            try {
                showLoading(true);
                
                const now = Date.now();
                const updates = {};
                
                // Prepare updates for all unread notifications
                allNotifications.forEach(notification => {
                    if (!notification.read) {
                        if (notification.type === 'announcement') {
                            updates[`userReadAnnouncements/${userId}/${notification.id}`] = {
                                read: true,
                                timestamp: now
                            };
                        } else if (notification.type === 'withdrawal') {
                            updates[`userNotifications/${userId}/${notification.id}/read`] = true;
                        }
                        notification.read = true;
                        notification.readTime = now;
                    }
                });
                
                // Update in Firebase
                await database.ref().update(updates);
                
                // Update UI
                updateNotificationStats();
                renderNotifications();
                renderNotificationDropdown();
                
                showLoading(false);
                
                // Close dropdown
                notificationDropdown.classList.remove('active');
                
            } catch (error) {
                console.error('Error marking all as read:', error);
                showLoading(false);
            }
        }

        // Function to filter notifications
        function filterNotifications(filter) {
            currentFilter = filter;
            renderNotifications();
            
            // Update active filter button
            filterButtons.forEach(btn => {
                if (btn.dataset.filter === filter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Function to render notifications grid
        function renderNotifications() {
            let filteredNotifications = [...allNotifications];
            
            // Apply filter
            switch(currentFilter) {
                case 'unread':
                    filteredNotifications = filteredNotifications.filter(n => !n.read);
                    break;
                case 'read':
                    filteredNotifications = filteredNotifications.filter(n => n.read);
                    break;
                case 'withdrawal':
                    filteredNotifications = filteredNotifications.filter(n => n.type === 'withdrawal');
                    break;
                case 'announcement':
                    filteredNotifications = filteredNotifications.filter(n => n.type === 'announcement');
                    break;
                // 'all' shows all notifications
            }
            
            if (filteredNotifications.length === 0) {
                let message = '';
                let icon = 'fas fa-bell-slash';
                
                switch(currentFilter) {
                    case 'unread':
                        message = 'No unread notifications';
                        icon = 'fas fa-envelope-open';
                        break;
                    case 'read':
                        message = 'No read notifications';
                        icon = 'fas fa-envelope';
                        break;
                    case 'withdrawal':
                        message = 'No withdrawal notifications';
                        icon = 'fas fa-money-bill-wave';
                        break;
                    case 'announcement':
                        message = 'No announcements';
                        icon = 'fas fa-bullhorn';
                        break;
                    default:
                        message = 'No notifications yet';
                        icon = 'fas fa-bell-slash';
                }
                
                notificationsGrid.innerHTML = `
                    <div class="no-notifications">
                        <i class="${icon} no-notifications-icon"></i>
                        <h3 class="no-notifications-title">${message}</h3>
                        <p class="no-notifications-text">
                            You'll see notifications here when you receive announcements or transaction updates.
                        </p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            filteredNotifications.forEach(notification => {
                const dateStr = formatDate(notification.timestamp);
                const readTimeStr = notification.readTime ? formatDate(notification.readTime) : 'Not read yet';
                const notificationType = getNotificationType(notification);
                const typeDisplay = getNotificationTypeDisplay(notification);
                
                // Shorten message for display
                let message = notification.message || '';
                if (message.length > 200) {
                    message = message.substring(0, 200) + '...';
                }
                
                // Determine icon based on notification type
                let icon = 'fas fa-bullhorn';
                if (notification.type === 'withdrawal') {
                    switch(notification.action) {
                        case 'approve': icon = 'fas fa-check-circle'; break;
                        case 'reject': icon = 'fas fa-times-circle'; break;
                        case 'delete': icon = 'fas fa-trash-alt'; break;
                        default: icon = 'fas fa-money-bill-wave';
                    }
                }
                
                html += `
                    <div class="notification-card ${notification.read ? 'read' : 'unread'} ${notificationType}-card" 
                         data-id="${notification.id}"
                         onclick="markAsRead('${notification.id}', '${notification.type}')">
                        <div class="card-header">
                            <div>
                                <div class="card-type">
                                    <span class="type-badge type-${notificationType}">${typeDisplay}</span>
                                    ${!notification.read ? '<span class="unread-badge">NEW</span>' : ''}
                                </div>
                                <h3 class="card-title">${notification.title || 'Notification'}</h3>
                                <div class="card-meta">
                                    <span><i class="far fa-clock"></i> ${dateStr}</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <p class="card-message">${message}</p>
                        </div>
                        <div class="card-footer">
                            <div class="read-status ${notification.read ? 'read' : 'unread'}">
                                <i class="fas ${icon}"></i>
                                <span>${notification.read ? 'Read' : 'Unread'}</span>
                            </div>
                            <div class="read-time">
                                <i class="far fa-clock"></i>
                                ${notification.read ? `Read ${readTimeStr}` : 'Not read yet'}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            notificationsGrid.innerHTML = html;
        }

        // Function to render notification dropdown
        function renderNotificationDropdown() {
            // Get recent notifications (last 5)
            const recentNotifications = [...allNotifications]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5);
            
            if (recentNotifications.length === 0) {
                notificationDropdownBody.innerHTML = `
                    <div class="dropdown-item">
                        <div class="item-icon announcement">
                            <i class="fas fa-bell-slash"></i>
                        </div>
                        <div class="item-content">
                            <div class="item-title">No notifications</div>
                            <div class="item-message">You don't have any notifications yet.</div>
                        </div>
                    </div>
                `;
                return;
            }
            
            let html = '';
            recentNotifications.forEach(notification => {
                const dateStr = formatDate(notification.timestamp);
                const message = notification.message ? 
                    (notification.message.length > 80 ? 
                        notification.message.substring(0, 80) + '...' : notification.message) : '';
                
                const notificationType = getNotificationType(notification);
                
                // Determine icon based on notification type
                let icon = 'fas fa-bullhorn';
                if (notification.type === 'withdrawal') {
                    switch(notification.action) {
                        case 'approve': icon = 'fas fa-check-circle'; break;
                        case 'reject': icon = 'fas fa-times-circle'; break;
                        case 'delete': icon = 'fas fa-trash-alt'; break;
                        default: icon = 'fas fa-money-bill-wave';
                    }
                }
                
                html += `
                    <div class="dropdown-item ${notification.read ? 'read' : 'unread'} ${notificationType}" 
                         data-id="${notification.id}"
                         onclick="markAsRead('${notification.id}', '${notification.type}'); notificationDropdown.classList.remove('active');">
                        <div class="item-icon ${notificationType}">
                            <i class="${icon}"></i>
                        </div>
                        <div class="item-content">
                            <div class="item-title">${notification.title || 'Notification'}</div>
                            <div class="item-message">${message}</div>
                            <div class="item-time">
                                <i class="far fa-clock"></i>
                                ${dateStr}
                                ${!notification.read ? '<span style="color: var(--info); font-weight: 600;"> • NEW</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            notificationDropdownBody.innerHTML = html;
        }

        // Function to show error message
        function showErrorMessage(message) {
            // Create error notification
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: var(--danger);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 1000;
                animation: slideIn 0.3s ease-out;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 300px;
            `;
            
            errorDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 20px;"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(errorDiv);
            
            // Remove after 5 seconds
            setTimeout(() => {
                errorDiv.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => errorDiv.remove(), 300);
            }, 5000);
        }

        // Initialize the application
        async function init() {
            showLoading(true);
            
            // Check authentication
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    currentUser = user;
                    
                    // Set user info
                    userName.textContent = user.email.split('@')[0];
                    
                    // Get user phone from database
                    const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.val();
                        userPhone.textContent = userData.phone || 'No phone';
                    }
                    
                    // Load notifications
                    await loadUserNotifications();
                    
                    showLoading(false);
                    
                    // Set up real-time listeners for notifications
                    // Listen for new announcements
                    database.ref('announcements').on('child_added', () => {
                        loadUserNotifications();
                    });
                    
                    // Listen for new user notifications
                    database.ref(`userNotifications/${user.uid}`).on('child_added', () => {
                        loadUserNotifications();
                    });
                    
                    // Listen for changes in user notifications
                    database.ref(`userNotifications/${user.uid}`).on('child_changed', () => {
                        loadUserNotifications();
                    });
                    
                } else {
                    // Not logged in, redirect to login
                    showLoading(false);
                    window.location.href = 'login.html';
                }
            });
        }

        // Event Listeners
        // Notification bell click
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('active');
        });

        // Mark all as read
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });

        // View all notifications
        viewAllNotifications.addEventListener('click', (e) => {
            e.preventDefault();
            notificationDropdown.classList.remove('active');
            // Scroll to top of notifications
            document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth' });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.remove('active');
            }
        });

        // Filter buttons
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterNotifications(btn.dataset.filter);
            });
        });

        // Logout
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });

        // Mobile sidebar toggle (if needed)
        if (window.innerWidth <= 480) {
            const mobileToggle = document.createElement('button');
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
            mobileToggle.style.cssText = `
                background: var(--golden);
                color: black;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
            
            document.body.appendChild(mobileToggle);
            
            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            });
        }

        // Initialize on page load
        window.addEventListener('DOMContentLoaded', init);