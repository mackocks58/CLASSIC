 // --------------------------------------
    // Firebase config & init
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
    // Initialize Firebase (if not already)
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();

    // ---------- Global variables ----------
    let currentUser = null, userId = null;
    let userData = null;
    let allNotifications = [];
    let unreadCount = 0;
    let notifications = []; // for ticker
    let currentNotificationIndex = 0;

    // Level data (same as video page)
    const levelData = {
      level1: { name: "Level 1", price: 150, dailyReturn: 12, perVideo: 2.4 },
      level2: { name: "Level 2", price: 300, dailyReturn: 25, perVideo: 5 },
      level3: { name: "Level 3", price: 450, dailyReturn: 37, perVideo: 7.4 },
      level4: { name: "Level 4", price: 600, dailyReturn: 50, perVideo: 10 },
      level5: { name: "Level 5", price: 1000, dailyReturn: 100, perVideo: 20 },
      level6: { name: "Level 6", price: 1500, dailyReturn: 150, perVideo: 30 },
      level7: { name: "Level 7", price: 2000, dailyReturn: 250, perVideo: 50 },
      level9: { name: "Level 8", price: 5000, dailyReturn: 625, perVideo: 125 },
      level8: { name: "Level 9", price: 10000, dailyReturn: 2000, perVideo: 400 },
      level10: { name: "Level 10", price: 20000, dailyReturn: 4000, perVideo: 800 }
    };

    const videoEarningsPerVideo = {
      level1: 2.4, level2: 5, level3: 7.4, level4: 10, level5: 20,
      level6: 30, level7: 50, level8: 125, level9: 400, level10: 800
    };

    // User data for videos
    let userVideoData = {
      balance: 0,
      currentLevel: null,
      levels: {},
      watchedVideos: {},
      lastWatchedDate: null,
      videosPerDay: 10,      // 10 videos per day
      earningPerVideo: 0
    };

    // Video player globals
    let currentVideoId = null;
    let watchTimer = null;
    let secondsWatched = 0;
    const REQUIRED_WATCH_TIME = 10;
    let hasEarnedFromCurrentVideo = false;

    // ---------- Helper functions ----------
    function formatAmount(amount) {
      return (amount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " BWP";
    }

    function showNotification(message, type = 'success') {
      const container = document.getElementById('notificationContainer');
      const notif = document.createElement('div');
      notif.className = `notification ${type}`;
      let icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' :
                 type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' :
                 '<i class="fas fa-exclamation-triangle"></i>';
      notif.innerHTML = `${icon}${message}`;
      container.appendChild(notif);
      setTimeout(() => notif.remove(), 3500);
    }

    function showLoading(message) {
      document.querySelector('#loadingOverlay .loading-text').textContent = message;
      document.getElementById('loadingOverlay').style.display = 'flex';
    }
    function hideLoading() {
      document.getElementById('loadingOverlay').style.display = 'none';
    }

    function updateBalances(data) {
      document.getElementById('accountBalance').innerText = formatAmount(data.balance || 0);
      document.getElementById('cumulativeBalance').innerText = formatAmount(data.deposited || 0);
    }

    // ---------- Notification functions ----------
    function formatDate(ts) {
      const d = new Date(ts);
      const now = new Date();
      const diff = now - d;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff/60000)} min ago`;
      if (diff < 86400000) return `${Math.floor(diff/3600000)} hr ago`;
      return d.toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    }

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

    // Mark as read (global)
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
    }

    // ---------- Video functions (10 videos, visible to all, playable only if invested) ----------
    function determineUserLevel(levelsData) {
      if (!levelsData) return null;
      const userLevels = Object.keys(levelsData);
      if (userLevels.length === 0) return null;
      const levelOrder = ['level10','level9','level8','level7','level6','level5','level4','level3','level2','level1'];
      for (const levelId of levelOrder) {
        if (userLevels.includes(levelId)) return levelId;
      }
      return null;
    }

    function countVideosWatchedToday() {
      if (!userVideoData.watchedVideos) return 0;
      const today = new Date().toDateString();
      return Object.values(userVideoData.watchedVideos).filter(date => date === today).length;
    }

    function isVideoWatchedToday(videoId) {
      if (!userVideoData.watchedVideos || !userVideoData.watchedVideos[videoId]) return false;
      const today = new Date().toDateString();
      if (userVideoData.lastWatchedDate !== today) {
        userVideoData.watchedVideos = {};
        userVideoData.lastWatchedDate = today;
        return false;
      }
      return userVideoData.watchedVideos[videoId] === today;
    }

    function canWatchMoreVideos() {
      return countVideosWatchedToday() < userVideoData.videosPerDay;
    }

    function loadVideosForLevel() {
      const videosGrid = document.getElementById('videosGrid');
      const hasLevel = userVideoData.currentLevel !== null && userVideoData.currentLevel !== undefined;

      videosGrid.innerHTML = '';
      // 10 thumbnails (repeat some to have 10)
      const thumbnails = [
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        'https://img.youtube.com/vi/L_jWHffIx5E/hqdefault.jpg',
        'https://img.youtube.com/vi/CduA0TULnow/hqdefault.jpg',
        'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg',
        'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg',
        'https://img.youtube.com/vi/3JZ_D3ELwOQ/hqdefault.jpg',
        'https://img.youtube.com/vi/4XuR9R-6kLg/hqdefault.jpg',
        'https://img.youtube.com/vi/5NV6Rdv1a3I/hqdefault.jpg',
        'https://img.youtube.com/vi/6_2yXwCJ0-o/hqdefault.jpg',
        'https://img.youtube.com/vi/7wtfhZwyrcc/hqdefault.jpg'
      ];

      for (let i = 1; i <= 10; i++) {
        const videoId = `video_${i}`;  // generic ID since level may not exist
        let statusClass = 'status-locked';
        let statusText = '🔒 Locked';
        let playButtonClass = 'play-btn';
        let earningsDisplay = '? BWP';

        if (hasLevel) {
          // For invested users, use level-specific earnings and check watch status
          const levelEarnings = videoEarningsPerVideo[userVideoData.currentLevel] || 0;
          earningsDisplay = formatAmount(levelEarnings);
          const isWatched = isVideoWatchedToday(videoId);
          if (isWatched) {
            statusClass = 'status-watched';
            statusText = '✓ Watched';
          } else if (!canWatchMoreVideos()) {
            statusClass = 'status-limit';
            statusText = '⏰ Daily limit';
          } else {
            statusClass = 'status-available';
            statusText = '▶ Available';
          }
        } else {
          earningsDisplay = '0 BWP';
        }

        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
          <div class="video-thumbnail">
            <img src="${thumbnails[(i-1) % thumbnails.length]}" alt="Video ${i}">
            <div class="video-overlay">
              <div class="${playButtonClass}" data-video-id="${videoId}" data-video-index="${i}" data-locked="${!hasLevel}">
                <i class="fas ${hasLevel ? 'fa-play' : 'fa-lock'}"></i>
              </div>
            </div>
          </div>
          <div class="video-info">
            <div class="video-title">Daily Task • Video ${i}</div>
            <div class="video-subtitle">${earningsDisplay} • 10s</div>
            <div class="video-earning">
              <i class="fas fa-coins"></i> ${earningsDisplay}
            </div>
            <div class="video-status-badge ${statusClass}">${statusText}</div>
          </div>
        `;
        videosGrid.appendChild(card);
      }

      // Attach play button listeners
      document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const locked = this.dataset.locked === 'true';
          const videoId = this.getAttribute('data-video-id');
          const videoIndex = this.getAttribute('data-video-index');

          if (locked) {
            showNotification('🔒 Invest first to activate your account and earn!', 'warning');
            return;
          }

          // If invested, proceed with normal checks
          if (!userVideoData.currentLevel) {
            showNotification('Invest first to activate your account', 'warning');
            return;
          }

          if (isVideoWatchedToday(videoId)) {
            showNotification('You have already watched this video today.', 'warning');
            return;
          }
          if (!canWatchMoreVideos()) {
            showNotification(`Daily limit reached (${userVideoData.videosPerDay} videos).`, 'warning');
            return;
          }
          playVideo(videoId, videoIndex);
        });
      });
    }

    // Video player functions (only called for invested users)
    function playVideo(videoId, videoIndex) {
      const modal = document.getElementById('videoModal');
      const videoPlayer = document.getElementById('modalVideoPlayer');
      const timerContainer = document.getElementById('timerContainer');
      const timerCount = document.getElementById('timerCount');
      const timerProgressBar = document.getElementById('timerProgressBar');
      const earningConfirmation = document.getElementById('earningConfirmation');
      const earnedAmountText = document.getElementById('earnedAmountText');

      hasEarnedFromCurrentVideo = false;
      currentVideoId = videoId;
      secondsWatched = 0;
      timerCount.textContent = REQUIRED_WATCH_TIME;
      timerProgressBar.style.width = '0%';
      earningConfirmation.style.display = 'none';

      const demoVideos = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreet.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
      ];
      videoPlayer.src = demoVideos[(videoIndex - 1) % demoVideos.length];

      modal.style.display = 'flex';
      timerContainer.style.display = 'flex';

      videoPlayer.play().catch(() => {});
      startWatchTimer(videoPlayer);
    }

    function startWatchTimer(videoPlayer) {
      if (watchTimer) clearInterval(watchTimer);
      watchTimer = setInterval(() => {
        if (videoPlayer.paused || videoPlayer.ended) return;
        secondsWatched++;
        const timeLeft = REQUIRED_WATCH_TIME - secondsWatched;
        document.getElementById('timerCount').textContent = timeLeft > 0 ? timeLeft : 0;
        document.getElementById('timerProgressBar').style.width = Math.min((secondsWatched / REQUIRED_WATCH_TIME) * 100, 100) + '%';

        if (secondsWatched >= REQUIRED_WATCH_TIME && !hasEarnedFromCurrentVideo) {
          creditVideoEarnings(currentVideoId);
        }
        if (secondsWatched >= REQUIRED_WATCH_TIME) {
          document.getElementById('timerCount').textContent = 'Earned!';
        }
      }, 1000);
    }

    function creditVideoEarnings(videoId) {
      if (hasEarnedFromCurrentVideo) return;
      hasEarnedFromCurrentVideo = true;
      if (watchTimer) clearInterval(watchTimer);

      const today = new Date().toDateString();
      userVideoData.watchedVideos[videoId] = today;
      userVideoData.lastWatchedDate = today;
      const earnings = videoEarningsPerVideo[userVideoData.currentLevel];
      const newBalance = userVideoData.balance + earnings;

      const updates = {};
      updates[`users/${currentUser.uid}/balance`] = newBalance;
      updates[`users/${currentUser.uid}/watchedVideos/${videoId}`] = today;
      updates[`users/${currentUser.uid}/lastWatchedDate`] = today;

      const transactionRef = database.ref('transactions').push();
      updates[`transactions/${transactionRef.key}`] = {
        userId: currentUser.uid,
        type: 'video_earning',
        level: userVideoData.currentLevel,
        videoId: videoId,
        amount: earnings,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        watchTime: REQUIRED_WATCH_TIME
      };

      database.ref().update(updates).then(() => {
        userVideoData.balance = newBalance;
        document.getElementById('accountBalance').textContent = formatAmount(userVideoData.balance);
        document.getElementById('earnedAmountText').textContent = `You earned ${formatAmount(earnings)} by watching 10 seconds!`;
        document.getElementById('earningConfirmation').style.display = 'block';

        setTimeout(() => {
          document.getElementById('videoModal').style.display = 'none';
          const videoPlayer = document.getElementById('modalVideoPlayer');
          videoPlayer.pause();
          videoPlayer.src = '';
          // Reload videos to update status
          loadVideosForLevel();
          showNotification(`🎉 You earned ${formatAmount(earnings)}!`, 'success');
        }, 3000);
      }).catch(error => showNotification('Error: ' + error.message, 'error'));
    }

    // ---------- Ticker for transactions ----------
    async function loadWithdrawalTransactions() {
      try {
        const snap = await database.ref('transactions').orderByChild('userId').equalTo(userId).limitToLast(10).once('value');
        if (snap.exists()) {
          const msgs = [];
          snap.forEach(tx => {
            const t = tx.val();
            if (t.type === 'video_earning') msgs.push(`🎥 earned ${formatAmount(t.amount)}`);
            else if (t.type === 'withdrawal') msgs.push(`💸 withdrawal ${t.status}: ${formatAmount(t.amount)}`);
            else if (t.type === 'deposit') msgs.push(`💳 deposited ${formatAmount(t.amount)}`);
          });
          notifications = msgs.reverse();
        }
      } catch (e) {}
    }

    function startTicker() {
      const ticker = document.getElementById('notificationBar');
      if (!ticker) return;
      function rotate() {
        if (notifications.length) {
          ticker.innerText = notifications[currentNotificationIndex] || '📢 no transactions';
          currentNotificationIndex = (currentNotificationIndex + 1) % notifications.length;
        }
        setTimeout(rotate, 3500);
      }
      rotate();
    }

    // ---------- Auth and initialization ----------
    let loadedCount = 0;
    function checkIfAllDataLoaded() {
      loadedCount++;
      if (loadedCount >= 2) {
        setTimeout(() => {
          document.getElementById('loadingOverlay').style.opacity = '0';
          setTimeout(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
            document.body.classList.add('loaded');
          }, 400);
        }, 600);
      }
    }

    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user; userId = user.uid;
        showLoading('Loading data...');
        loadUserNotifications().finally(() => checkIfAllDataLoaded());
        database.ref('users/'+userId).once('value').then(snap => {
          if (snap.exists()) {
            const data = snap.val();
            updateBalances(data);
            // Populate userVideoData
            userVideoData.balance = data.balance || 0;
            userVideoData.levels = data.levels || {};
            userVideoData.watchedVideos = data.watchedVideos || {};
            userVideoData.lastWatchedDate = data.lastWatchedDate || null;
            userVideoData.currentLevel = determineUserLevel(data.levels);
            // Load videos (always show 10)
            loadVideosForLevel();
          } else {
            // New user, no data yet
            loadVideosForLevel(); // will show locked videos
          }
          checkIfAllDataLoaded();
        }).catch(()=> {
          loadVideosForLevel();
          checkIfAllDataLoaded();
        });
        loadWithdrawalTransactions().finally(() => {
          checkIfAllDataLoaded();
          startTicker();
        });

        // Real-time listener for user data changes
        database.ref('users/'+userId).on('value', (s) => {
          if (s.exists()) {
            const data = s.val();
            updateBalances(data);
            userVideoData.balance = data.balance || 0;
            userVideoData.levels = data.levels || {};
            userVideoData.watchedVideos = data.watchedVideos || {};
            userVideoData.lastWatchedDate = data.lastWatchedDate || null;
            userVideoData.currentLevel = determineUserLevel(data.levels);
            loadVideosForLevel(); // refresh videos
          }
        });

      } else {
        window.location.href = "login.html";
      }
    });

    // ---------- Event listeners ----------
    document.getElementById('closePopupBtn').addEventListener('click', ()=>{
      document.getElementById('welcomePopup').classList.remove('active');
    });

    document.getElementById('notificationBell').addEventListener('click', (e)=>{
      e.stopPropagation();
      document.getElementById('notificationDropdown').classList.toggle('active');
    });

    document.addEventListener('click', function(e) {
      const dd = document.getElementById('notificationDropdown');
      if (!dd.contains(e.target) && !e.target.closest('.notification-bell')) dd.classList.remove('active');
    });

    // Modal close
    document.getElementById('closeModal').addEventListener('click', function() {
      document.getElementById('videoModal').style.display = 'none';
      const videoPlayer = document.getElementById('modalVideoPlayer');
      videoPlayer.pause();
      videoPlayer.src = '';
      if (watchTimer) clearInterval(watchTimer);
    });

    document.getElementById('videoModal').addEventListener('click', function(e) {
      if (e.target === this) {
        document.getElementById('videoModal').style.display = 'none';
        const videoPlayer = document.getElementById('modalVideoPlayer');
        videoPlayer.pause();
        videoPlayer.src = '';
        if (watchTimer) clearInterval(watchTimer);
      }
    });

    document.getElementById('modalVideoPlayer').addEventListener('ended', function() {
      if (!hasEarnedFromCurrentVideo && secondsWatched > 0) {
        if (secondsWatched >= REQUIRED_WATCH_TIME) {
          creditVideoEarnings(currentVideoId);
        } else {
          showNotification(`You watched ${secondsWatched}s. Need ${REQUIRED_WATCH_TIME}s to earn.`, 'warning');
        }
      }
    });

    // Mark all read button (if present) – not in this page, but we can leave it
    const markAllBtn = document.querySelector('.mark-all-read');
    if (markAllBtn) markAllBtn.addEventListener('click', markAllAsRead);