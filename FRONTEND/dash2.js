// Firebase config
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
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const database = firebase.database();

        // Level data (simplified for dashboard)
        const levelData = {
            level1: { name: "Level 1", dailyReturn: 12 },
            level2: { name: "Level 2", dailyReturn: 25 },
            level3: { name: "Level 3", dailyReturn: 37 },
            level4: { name: "Level 4", dailyReturn: 50 },
            level5: { name: "Level 5", dailyReturn: 100 },
            level6: { name: "Level 6", dailyReturn: 150 },
            level7: { name: "Level 7", dailyReturn: 250 },
            level9: { name: "Level 8", dailyReturn: 625 },
            level8: { name: "Level 9", dailyReturn: 2000 },
            level10: { name: "Level 10", dailyReturn: 4000 }
        };
        const levelIcons = {
            level1: 'fas fa-certificate', level2: 'fas fa-star', level3: 'fas fa-medal',
            level4: 'fas fa-award', level5: 'fas fa-gem', level6: 'fas fa-crown',
            level7: 'fas fa-trophy', level8: 'fas fa-rocket', level9: 'fas fa-diamond',
            level10: 'fas fa-globe', none: 'fas fa-user'
        };
        const levelNames = {
            level1: 'Level 1', level2: 'Level 2', level3: 'Level 3', level4: 'Level 4',
            level5: 'Level 5', level6: 'Level 6', level7: 'Level 7', level8: 'Level 8',
            level9: 'Level 9', level10: 'Level 10', none: 'No Level'
        };

        let currentUser = null, userId = null;
        let userData = null;
        let allNotifications = [];
        let unreadCount = 0;
        let notificationsTicker = [];
        let tickerIndex = 0;

        function formatAmount(amt) {
            return (amt || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " BWP";
        }
        function formatDate(ts) {
            const d = new Date(ts);
            const now = new Date();
            const diff = now - d;
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff/60000)} min ago`;
            if (diff < 86400000) return `${Math.floor(diff/3600000)} hr ago`;
            return d.toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        }

        function getCurrentLevel(levels) {
            if (!levels) return 'none';
            const levelOrder = ['level10','level9','level8','level7','level6','level5','level4','level3','level2','level1'];
            for (let id of levelOrder) if (levels[id]) return id;
            return 'none';
        }
        function countVideosWatchedToday(watched) {
            if (!watched) return 0;
            const today = new Date().toDateString();
            return Object.values(watched).filter(d => d === today).length;
        }
        function getDailyVideoEarnings(levelId) {
            return levelData[levelId]?.dailyReturn || 0;
        }

        // Notification functions
        function updateNotificationBadge() {
            const badge = document.getElementById('notificationBadge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
                document.getElementById('popupNotificationCount').textContent = unreadCount;
            } else {
                badge.style.display = 'none';
            }
        }
        function renderNotificationDropdown(notifs) {
            const container = document.getElementById('notificationDropdownBody');
            if (!notifs || notifs.length === 0) {
                container.innerHTML = `<div class="dropdown-item">✨ no notifications</div>`;
                return;
            }
            let html = '';
            notifs.slice(0,5).forEach(n => {
                html += `<div class="dropdown-item ${n.read ? '' : 'unread'}">
                    <div class="item-title">${n.title || 'Notification'}</div>
                    <div class="item-message">${(n.message||'').substring(0,60)}</div>
                    <div class="item-time">${formatDate(n.timestamp)}</div>
                </div>`;
            });
            container.innerHTML = html;
        }
        async function loadUserNotifications() {
            try {
                userId = currentUser.uid;
                const readSnap = await database.ref(`userReadAnnouncements/${userId}`).once('value');
                const readAnnouncements = readSnap.val() || {};

                const annSnap = await database.ref('announcements').once('value');
                let announcements = [];
                if (annSnap.exists()) {
                    annSnap.forEach(child => {
                        let a = child.val(); a.id = child.key; a.type='announcement';
                        a.read = readAnnouncements[a.id] ? true : false;
                        announcements.push(a);
                    });
                }

                const notifSnap = await database.ref(`userNotifications/${userId}`).once('value');
                let userNotifications = [];
                if (notifSnap.exists()) {
                    notifSnap.forEach(c => { let n = c.val(); n.id = c.key; n.type='withdrawal'; userNotifications.push(n); });
                }

                allNotifications = [...announcements, ...userNotifications].sort((a,b)=> (b.timestamp||0)-(a.timestamp||0));
                unreadCount = allNotifications.filter(n => !n.read).length;
                updateNotificationBadge();
                renderNotificationDropdown(allNotifications);
                if (unreadCount>0) document.getElementById('welcomePopup').classList.add('active');
            } catch (e) { console.warn(e); }
        }

        function updateBalances(data) {
            document.getElementById('accountBalance').innerText = formatAmount(data.balance || 0);
            document.getElementById('cumulativeBalance').innerText = formatAmount(data.deposited || 0);
        }

        // ----- RENDER HOME PAGE (dashboard) -----
        function renderHomePage() {
            if (!userData) return;
            const main = document.getElementById('mainContent');
            const currentLevel = getCurrentLevel(userData.levels);
            const videosToday = countVideosWatchedToday(userData.watchedVideos);
            const totalVideos = 5;
            const dailyEarnings = getDailyVideoEarnings(currentLevel);

            main.innerHTML = `
                <div class="stats-grid">
                    <div class="stats-card"><div class="stats-icon"><i class="fas fa-wallet"></i></div><div class="stats-info"><h3>${formatAmount(userData.balance || 0)}</h3><p>Available Balance</p></div></div>
                    <div class="stats-card"><div class="stats-icon"><i class="${levelIcons[currentLevel]}"></i></div><div class="stats-info"><h3>${levelNames[currentLevel]}</h3><p>Current Level</p></div></div>
                    <div class="stats-card"><div class="stats-icon"><i class="fas fa-video"></i></div><div class="stats-info"><h3>${videosToday}/${totalVideos}</h3><p>Videos Today</p></div></div>
                    <div class="stats-card"><div class="stats-icon"><i class="fas fa-coins"></i></div><div class="stats-info"><h3>${formatAmount(dailyEarnings)}</h3><p>Daily Earnings</p></div></div>
                </div>

                <h3 class="quick-links-title">Quick Links</h3>
                <div class="quick-links-grid">
                    <div class="quick-link" data-page="referrals"><a href="#referrals"><div class="quick-link-icon"><i class="fas fa-coins"></i></div><h4>Referrals</h4></a></div>
                    <div class="quick-link" data-page="share"><a href="#share"><div class="quick-link-icon"><i class="fas fa-share-alt"></i></div><h4>Share</h4></a></div>
                    <div class="quick-link" data-page="withdrawals"><a href="#withdrawals"><div class="quick-link-icon"><i class="fas fa-history"></i></div><h4>Withdrawals</h4></a></div>
                    <div class="quick-link" data-page="earnings"><a href="#earnings"><div class="quick-link-icon"><i class="fas fa-chart-line"></i></div><h4>Earnings</h4></a></div>
                    <div class="quick-link" data-page="commissions"><a href="#commissions"><div class="quick-link-icon"><i class="fas fa-users"></i></div><h4>Commissions</h4></a></div>
                    <div class="quick-link" data-page="deposits"><a href="#deposits"><div class="quick-link-icon"><i class="fas fa-book"></i></div><h4>Deposits</h4></a></div>
                    <div class="quick-link" data-page="whatsapp"><a href="#whatsapp"><div class="quick-link-icon"><i class="fab fa-whatsapp"></i></div><h4>WhatsApp</h4></a></div>
                    <div class="quick-link" data-page="support"><a href="#support"><div class="quick-link-icon"><i class="fas fa-headset"></i></div><h4>Support</h4></a></div>
                </div>

                <div class="activity-card">
                    <div class="activity-header"><h3>Recent Activity</h3><a href="#" class="view-all">View All</a></div>
                    <div class="activity-list" id="activityList"></div>
                </div>

                <div class="notifications-card">
                    <div class="notifications-header"><h3><i class="fas fa-bell"></i> Recent Notifications</h3><button class="mark-all-read" id="markAllReadBtn"><i class="fas fa-check-double"></i> Mark all read</button></div>
                    <div class="notifications-list" id="notificationsList"></div>
                </div>
            `;

            // Activity list
            const activityList = document.getElementById('activityList');
            activityList.innerHTML = '';
            if (userData.transactions) {
                const txs = Object.values(userData.transactions).sort((a,b)=> (b.timestamp||0)-(a.timestamp||0)).slice(0,5);
                txs.forEach(tx => {
                    const icon = tx.type === 'video_earning' ? 'fas fa-video' :
                                tx.type === 'investment' ? 'fas fa-chart-line' :
                                tx.type === 'upgrade' ? 'fas fa-level-up-alt' :
                                tx.type === 'withdrawal' ? 'fas fa-money-bill-wave' : 'fas fa-exchange-alt';
                    const title = tx.type === 'video_earning' ? 'Video Earnings' :
                                 tx.type === 'investment' ? 'Investment' :
                                 tx.type === 'upgrade' ? 'Upgrade' :
                                 tx.type === 'withdrawal' ? 'Withdrawal' : 'Transaction';
                    const desc = tx.type === 'video_earning' ? `Earned ${formatAmount(tx.amount)}` :
                                tx.type === 'investment' ? `Invested ${formatAmount(tx.amount)}` :
                                tx.type === 'upgrade' ? `Upgraded to ${tx.levelName}` :
                                tx.type === 'withdrawal' ? `Requested ${formatAmount(tx.amount)}` : '';
                    activityList.innerHTML += `
                        <div class="activity-item">
                            <div class="activity-icon"><i class="${icon}"></i></div>
                            <div class="activity-content">
                                <h4>${title}</h4>
                                <p>${desc}</p>
                                <div class="activity-time">${formatDate(tx.timestamp)}</div>
                            </div>
                        </div>
                    `;
                });
            }
            if (activityList.innerHTML === '') {
                activityList.innerHTML = '<p style="padding:10px; text-align:center; color:#2d6a9f;">No recent activity</p>';
            }

            // Notifications list
            const notifList = document.getElementById('notificationsList');
            if (allNotifications.length === 0) {
                notifList.innerHTML = '<div class="no-notifications"><i class="fas fa-bell-slash"></i><p>No notifications yet</p></div>';
            } else {
                let html = '';
                allNotifications.slice(0,5).forEach(n => {
                    const typeClass = n.type === 'withdrawal' ? 
                        (n.action === 'approve' ? 'withdrawal-approve' : n.action === 'reject' ? 'withdrawal-reject' : 'withdrawal-delete') : 'announcement';
                    const icon = n.type === 'withdrawal' ? 
                        (n.action === 'approve' ? 'fas fa-check-circle' : n.action === 'reject' ? 'fas fa-times-circle' : 'fas fa-trash-alt') : 'fas fa-bullhorn';
                    html += `
                        <div class="notification-item ${n.read ? 'read' : 'unread'} ${typeClass}" onclick="markAsRead('${n.id}','${n.type}')">
                            <div class="notification-icon"><i class="${icon}"></i></div>
                            <div class="notification-content">
                                <div class="notification-title">${n.title || 'Notification'}</div>
                                <div class="notification-message">${(n.message||'').substring(0,60)}</div>
                                <div class="notification-time">${formatDate(n.timestamp)} <span class="notification-status ${n.read ? 'status-read' : 'status-unread'}">${n.read ? 'Read' : 'New'}</span></div>
                            </div>
                        </div>
                    `;
                });
                notifList.innerHTML = html;
            }
            document.getElementById('markAllReadBtn')?.addEventListener('click', markAllAsRead);
        }

        // ----- SPA ROUTER: load external HTML files -----
        const pageCache = {};

        async function loadPage(url) {
            if (pageCache[url]) return pageCache[url];
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                const html = await response.text();
                pageCache[url] = html;
                return html;
            } catch (error) {
                console.error('Failed to load page:', error);
                return `<div class="page-card"><h2>Error loading page</h2><p>${error.message}</p></div>`;
            }
        }

        async function showPage(page) {
            const main = document.getElementById('mainContent');
            main.innerHTML = `<div class="page-card" style="text-align:center;"><i class="fas fa-spinner fa-pulse fa-3x"></i><p>Loading...</p></div>`;

            let content = '';

            switch(page) {
                case 'home':
                    renderHomePage();
                    break;
                case 'account':
                    content = await loadPage('account.html');
                    main.innerHTML = content;
                    break;
                case 'more':
                    content = await loadPage('dash2.html');
                    main.innerHTML = content;
                    break;
                case 'tasks':
                    content = await loadPage('tasks.html');
                    main.innerHTML = content;
                    break;
                case 'referrals':
                    content = await loadPage('referrals.html');
                    main.innerHTML = content;
                    break;
                case 'share':
                    content = await loadPage('share.html');
                    main.innerHTML = content;
                    break;
                case 'withdrawals':
                    content = await loadPage('withdrawals.html');
                    main.innerHTML = content;
                    break;
                case 'earnings':
                    content = await loadPage('earnings.html');
                    main.innerHTML = content;
                    break;
                case 'commissions':
                    content = await loadPage('commissions.html');
                    main.innerHTML = content;
                    break;
                case 'deposits':
                    content = await loadPage('deposits.html');
                    main.innerHTML = content;
                    break;
                case 'support':
                    content = await loadPage('support.html');
                    main.innerHTML = content;
                    break;
                case 'whatsapp':
                    window.open('https://chat.whatsapp.com/DFIfSFYTIj5GHDDFDSSS3Qj2KMWsL?mode=gi_t', '_blank');
                    location.hash = 'home';
                    return;
                default:
                    main.innerHTML = `<div class="page-card">Page not found</div>`;
            }

            // Update active nav
            document.querySelectorAll('.nav-icon').forEach(icon => {
                icon.classList.toggle('active', icon.dataset.page === page);
            });

            // Update hash
            location.hash = page;
        }

        // Mark as read
        window.markAsRead = async (id, type) => {
            const notif = allNotifications.find(n => n.id === id);
            if (!notif || notif.read) return;
            if (type === 'announcement') {
                await database.ref(`userReadAnnouncements/${userId}/${id}`).set({ read: true, timestamp: Date.now() });
            } else {
                await database.ref(`userNotifications/${userId}/${id}/read`).set(true);
            }
            notif.read = true;
            unreadCount = allNotifications.filter(n => !n.read).length;
            updateNotificationBadge();
            renderNotificationDropdown(allNotifications);
            if (location.hash === '#home') renderHomePage();
        };

        async function markAllAsRead() {
            const now = Date.now();
            const updates = {};
            allNotifications.forEach(n => {
                if (!n.read) {
                    if (n.type === 'announcement') updates[`userReadAnnouncements/${userId}/${n.id}`] = { read: true, timestamp: now };
                    else updates[`userNotifications/${userId}/${n.id}/read`] = true;
                    n.read = true;
                }
            });
            await database.ref().update(updates);
            unreadCount = 0;
            updateNotificationBadge();
            renderNotificationDropdown(allNotifications);
            if (location.hash === '#home') renderHomePage();
        }

        // Auth
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user; userId = user.uid;
                document.getElementById('loadingOverlay').style.display = 'flex';
                try {
                    const snap = await database.ref(`users/${userId}`).once('value');
                    userData = snap.val() || {};
                    updateBalances(userData);
                    await loadUserNotifications();
                    database.ref(`users/${userId}`).on('value', s => {
                        userData = s.val();
                        if (userData) updateBalances(userData);
                        if (location.hash === '#home') renderHomePage();
                    });
                    const initial = location.hash.replace('#', '') || 'home';
                    await showPage(initial);
                } catch (e) { console.error(e); }
                setTimeout(() => {
                    document.getElementById('loadingOverlay').style.opacity = '0';
                    setTimeout(() => {
                        document.getElementById('loadingOverlay').style.display = 'none';
                        document.body.classList.add('loaded');
                    }, 400);
                }, 800);
            } else {
                window.location.href = 'login.html';
            }
        });

        // Hash change
        window.addEventListener('hashchange', () => {
            const hash = location.hash.replace('#', '') || 'home';
            showPage(hash);
        });

        // Notification bell
        document.getElementById('notificationBell').addEventListener('click', (e)=>{
            e.stopPropagation();
            document.getElementById('notificationDropdown').classList.toggle('active');
        });
        document.addEventListener('click', (e)=>{
            const dd = document.getElementById('notificationDropdown');
            if (!dd.contains(e.target) && !e.target.closest('.notification-bell')) dd.classList.remove('active');
        });
        document.getElementById('closePopupBtn').addEventListener('click', ()=>{
            document.getElementById('welcomePopup').classList.remove('active');
        });

        // Bottom nav clicks
        document.querySelectorAll('.nav-icon a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('href').replace('#', '');
                showPage(page);
            });
        });

        // Also handle quick link clicks (they have data-page attributes)
        document.addEventListener('click', (e) => {
            const quickLink = e.target.closest('[data-page]');
            if (quickLink) {
                e.preventDefault();
                const page = quickLink.dataset.page;
                showPage(page);
            }
        });