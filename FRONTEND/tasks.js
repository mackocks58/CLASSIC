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
        
        // Level data (same as investment page)
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
        
        // Current user data
        let currentUser = null;
        let userData = {
            balance: 0,
            currentLevel: null,
            levels: {},
            watchedVideos: {},
            lastWatchedDate: null,
            videosPerDay: 5, // 5 videos per day for all levels
            earningPerVideo: 0
        };
        
        // Video earnings per video (50 TSh per video for Level 1, others calculated proportionally)
        // Level 1: 250 TSh daily / 5 videos = 50 TSh per video
        const videoEarningsPerVideo = {
            level1: 2.4,    
            level2: 5,    
            level3: 7.4,   
            level4: 10,   
            level5: 20,  
            level6: 30,  
            level7: 50,  
            level8: 125, 
            level9: 400, 
            level10: 800  
        };
        
        // Level icons
        const levelIcons = {
            level1: 'fas fa-certificate',
            level2: 'fas fa-star',
            level3: 'fas fa-medal',
            level4: 'fas fa-award',
            level5: 'fas fa-gem',
            level6: 'fas fa-crown',
            level7: 'fas fa-trophy',
            level8: 'fas fa-rocket',
            level9: 'fas fa-diamond',
            level10: 'fas fa-globe'
        };
        
        // Video tracking variables
        let currentVideoId = null;
        let watchTimer = null;
        let secondsWatched = 0;
        const REQUIRED_WATCH_TIME = 10; // 10 seconds required for earning
        let hasEarnedFromCurrentVideo = false;
        
        // Function to show notification
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            let icon = '';
            if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
            else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
            else if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';
            
            notification.innerHTML = `${icon}${message}`;
            
            const container = document.getElementById('notificationContainer');
            container.appendChild(notification);
            
            // Remove notification after animation completes
            setTimeout(() => {
                notification.remove();
            }, 3500);
        }
        
        // Function to show loading overlay
        function showLoading(message) {
            document.getElementById('loadingText').textContent = message;
            document.getElementById('loadingOverlay').style.display = 'flex';
        }
        
        // Function to hide loading overlay
        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
        
        // Function to format amount
        function formatAmount(amount) {
            return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' BWP';
        }
        
        // NEW: Function to determine user's current level correctly
        function determineUserLevel(levelsData) {
            if (!levelsData) return null;
            
            console.log("User levels data:", levelsData);
            
            // Get all level IDs the user has
            const userLevels = Object.keys(levelsData);
            
            if (userLevels.length === 0) return null;
            
            // Define level order from highest to lowest
            const levelOrder = ['level10', 'level9', 'level8', 'level7', 'level6', 'level5', 'level4', 'level3', 'level2', 'level1'];
            
            // Find the highest level the user has based on level order
            for (const levelId of levelOrder) {
                if (userLevels.includes(levelId)) {
                    console.log("User's highest level:", levelId);
                    return levelId;
                }
            }
            
            return null;
        }
        
        // Function to update user level display
        function updateLevelDisplay() {
            const levelName = document.getElementById('levelName');
            const levelIcon = document.getElementById('levelIcon');
            const levelDescription = document.getElementById('levelDescription');
            const earningRate = document.getElementById('earningRate');
            const videosTitle = document.getElementById('videosTitle');
            const videosWatched = document.getElementById('videosWatched');
            
            if (userData.currentLevel && levelData[userData.currentLevel]) {
                const level = levelData[userData.currentLevel];
                const earningPerVideo = videoEarningsPerVideo[userData.currentLevel];
                userData.earningPerVideo = earningPerVideo;
                
                levelName.textContent = level.name;
                levelIcon.innerHTML = `<i class="${levelIcons[userData.currentLevel]}"></i>`;
                levelDescription.textContent = `Daily income: ${formatAmount(level.dailyReturn)} (5 videos × ${formatAmount(earningPerVideo)} per video)`;
                earningRate.textContent = formatAmount(earningPerVideo) + ' per video (10 seconds)';
                videosTitle.textContent = `${level.name} Videos`;
                
                // Count videos watched today
                const videosWatchedToday = countVideosWatchedToday();
                videosWatched.textContent = `${videosWatchedToday}/${userData.videosPerDay} videos watched today`;
                
                // Show warning if all videos watched
                if (videosWatchedToday >= userData.videosPerDay) {
                    showNotification(`You have watched all ${userData.videosPerDay} videos for today. Come back tomorrow!`, 'warning');
                }
            } else {
                levelName.textContent = 'No Level';
                levelIcon.innerHTML = '<i class="fas fa-user"></i>';
                levelDescription.textContent = 'You haven\'t invested in any level yet';
                earningRate.textContent = '0 BWP per video';
                videosTitle.textContent = 'No Videos Available';
                videosWatched.textContent = '0 videos watched today';
            }
        }
        
        // Function to check if video was watched today
        function isVideoWatchedToday(videoId) {
            if (!userData.watchedVideos || !userData.watchedVideos[videoId]) {
                return false;
            }
            
            // Check if we have a new day (reset watched videos)
            const today = new Date().toDateString();
            if (userData.lastWatchedDate !== today) {
                userData.watchedVideos = {};
                userData.lastWatchedDate = today;
                return false;
            }
            
            return userData.watchedVideos[videoId] === today;
        }
        
        // Function to count videos watched today
        function countVideosWatchedToday() {
            if (!userData.watchedVideos) return 0;
            
            const today = new Date().toDateString();
            return Object.values(userData.watchedVideos).filter(date => date === today).length;
        }
        
        // Function to check if user can watch more videos today
        function canWatchMoreVideos() {
            const videosWatchedToday = countVideosWatchedToday();
            return videosWatchedToday < userData.videosPerDay;
        }
        
        // Function to load videos for user's level
        function loadVideosForLevel() {
            if (!userData.currentLevel) {
                document.getElementById('videosGrid').innerHTML = '<p style="color: #ffd700; text-align: center; padding: 20px;">Please invest in a level to access videos</p>';
                return;
            }
            
            showLoading('Loading videos...');
            
            // For demo purposes, we'll create 5 videos for each level
            const videosGrid = document.getElementById('videosGrid');
            videosGrid.innerHTML = '';
            
            // Create 5 video cards for the user's level
            for (let i = 1; i <= 5; i++) {
                const videoId = `${userData.currentLevel}_video_${i}`;
                const isWatched = isVideoWatchedToday(videoId);
                
                // Use different video thumbnails for variety
                const thumbnails = [
                    'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                    'https://img.youtube.com/vi/L_jWHffIx5E/hqdefault.jpg',
                    'https://img.youtube.com/vi/CduA0TULnow/hqdefault.jpg',
                    'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg',
                    'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg'
                ];
                
                const videoCard = document.createElement('div');
                videoCard.className = 'video-card';
                videoCard.innerHTML = `
                    <div class="video-thumbnail">
                        <img src="${thumbnails[i-1]}" alt="Video ${i}" style="width:100%; height:100%; object-fit:cover;">
                        <div class="video-overlay">
                            <div class="play-btn" data-video-id="${videoId}" data-video-index="${i}">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                    </div>
                    <div class="video-info">
                        <div class="video-title">${userData.currentLevel} - Video ${i}</div>
                        <div class="video-earning">
                            <i class="fas fa-coins"></i>
                            <span>${formatAmount(videoEarningsPerVideo[userData.currentLevel])} for 10s watch</span>
                        </div>
                        ${isWatched ? 
                            '<div class="video-status status-completed">✓ Watched Today</div>' : 
                            (canWatchMoreVideos() ? 
                                '<div class="video-status status-pending">▶ Available (Watch 10s)</div>' : 
                                '<div class="video-status status-pending" style="color: #ff0055;">Daily Limit Reached</div>')}
                    </div>
                `;
                
                videosGrid.appendChild(videoCard);
            }
            
            // Add click event to play buttons
            document.querySelectorAll('.play-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const videoId = this.getAttribute('data-video-id');
                    const videoIndex = this.getAttribute('data-video-index');
                    
                    if (isVideoWatchedToday(videoId)) {
                        showNotification('You have already watched this video today. Come back tomorrow!', 'warning');
                        return;
                    }
                    
                    if (!canWatchMoreVideos()) {
                        showNotification(`You have already watched ${userData.videosPerDay} videos today. Daily limit reached!`, 'warning');
                        return;
                    }
                    
                    playVideo(videoId, videoIndex);
                });
            });
            
            hideLoading();
        }
        
        // Function to play video in modal (demo simulation)
        function playVideo(videoId, videoIndex) {
            const modal = document.getElementById('videoModal');
            const videoPlayer = document.getElementById('modalVideoPlayer');
            const timerContainer = document.getElementById('timerContainer');
            const timerCount = document.getElementById('timerCount');
            const timerProgressBar = document.getElementById('timerProgressBar');
            const earningConfirmation = document.getElementById('earningConfirmation');
            const earnedAmountText = document.getElementById('earnedAmountText');
            
            // Reset earning flag
            hasEarnedFromCurrentVideo = false;
            currentVideoId = videoId;
            
            // Reset timer
            secondsWatched = 0;
            timerCount.textContent = REQUIRED_WATCH_TIME;
            timerProgressBar.style.width = '0%';
            
            // Hide earning confirmation
            earningConfirmation.style.display = 'none';
            
            // For demo, we'll use a placeholder video
            // In production, replace with actual video URLs
            const demoVideos = [
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
            ];
            
            // Set video source
            videoPlayer.src = demoVideos[videoIndex - 1] || demoVideos[0];
            
            // Show modal
            modal.style.display = 'flex';
            
            // Show timer
            timerContainer.style.display = 'flex';
            
            // Start video
            const playPromise = videoPlayer.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Video started playing successfully
                    startWatchTimer(videoPlayer);
                }).catch(error => {
                    console.log("Auto-play prevented:", error);
                    // Start timer even if auto-play is prevented
                    startWatchTimer(videoPlayer);
                });
            } else {
                startWatchTimer(videoPlayer);
            }
        }
        
        // Function to start watch timer
        function startWatchTimer(videoPlayer) {
            // Clear any existing timer
            if (watchTimer) {
                clearInterval(watchTimer);
            }
            
            // Start new timer
            watchTimer = setInterval(() => {
                if (videoPlayer.paused || videoPlayer.ended) {
                    return; // Don't count if video is paused or ended
                }
                
                secondsWatched++;
                const timeLeft = REQUIRED_WATCH_TIME - secondsWatched;
                
                // Update timer display
                document.getElementById('timerCount').textContent = timeLeft > 0 ? timeLeft : 0;
                
                // Update progress bar
                const progressPercentage = (secondsWatched / REQUIRED_WATCH_TIME) * 100;
                document.getElementById('timerProgressBar').style.width = Math.min(progressPercentage, 100) + '%';
                
                // Check if user has watched for required time
                if (secondsWatched >= REQUIRED_WATCH_TIME && !hasEarnedFromCurrentVideo) {
                    creditVideoEarnings(currentVideoId);
                }
                
                // If time is up, change timer style
                if (secondsWatched >= REQUIRED_WATCH_TIME) {
                    document.getElementById('timerCount').textContent = "Earned!";
                    document.getElementById('timerCount').className = "timer-complete";
                }
            }, 1000); // Check every second
        }
        
        // Function to credit video earnings (after 10 seconds)
        function creditVideoEarnings(videoId) {
            if (hasEarnedFromCurrentVideo) return; // Prevent double earning
            hasEarnedFromCurrentVideo = true;
            
            // Clear the timer
            if (watchTimer) {
                clearInterval(watchTimer);
                watchTimer = null;
            }
            
            // Mark video as watched today
            const today = new Date().toDateString();
            userData.watchedVideos[videoId] = today;
            userData.lastWatchedDate = today;
            
            // Calculate earnings
            const earnings = videoEarningsPerVideo[userData.currentLevel];
            const newBalance = userData.balance + earnings;
            
            // Update database
            const updates = {};
            updates[`users/${currentUser.uid}/balance`] = newBalance;
            updates[`users/${currentUser.uid}/watchedVideos/${videoId}`] = today;
            updates[`users/${currentUser.uid}/lastWatchedDate`] = today;
            
            // Record transaction
            const transactionData = {
                userId: currentUser.uid,
                type: 'video_earning',
                level: userData.currentLevel,
                videoId: videoId,
                amount: earnings,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                watchTime: REQUIRED_WATCH_TIME
            };
            
            const transactionRef = database.ref('transactions').push();
            updates[`transactions/${transactionRef.key}`] = transactionData;
            
            database.ref().update(updates)
                .then(() => {
                    // Update local data
                    userData.balance = newBalance;
                    
                    // Update UI
                    document.getElementById('userBalance').textContent = formatAmount(userData.balance);
                    
                    // Show earning confirmation
                    const earningConfirmation = document.getElementById('earningConfirmation');
                    const earnedAmountText = document.getElementById('earnedAmountText');
                    
                    earnedAmountText.textContent = `You have earned ${formatAmount(earnings)} for watching 10 seconds!`;
                    earningConfirmation.style.display = 'block';
                    
                    // Auto close modal after 3 seconds
                    setTimeout(() => {
                        document.getElementById('videoModal').style.display = 'none';
                        const videoPlayer = document.getElementById('modalVideoPlayer');
                        videoPlayer.pause();
                        videoPlayer.src = '';
                        
                        // Update display and reload videos
                        updateLevelDisplay();
                        loadVideosForLevel();
                        
                        showNotification(`🎉 Congratulations! You earned ${formatAmount(earnings)} for watching 10 seconds!`, 'success');
                    }, 3000);
                })
                .catch((error) => {
                    showNotification('Error processing earnings: ' + error.message, 'error');
                });
        }
        
        // Function to handle video ended event (backup in case video ends before 10 seconds)
        function handleVideoEnded() {
            if (!hasEarnedFromCurrentVideo && secondsWatched > 0) {
                // If video ends before 10 seconds but user watched some, still credit if they reached the required time
                if (secondsWatched >= REQUIRED_WATCH_TIME) {
                    creditVideoEarnings(currentVideoId);
                } else {
                    showNotification(`You watched only ${secondsWatched} seconds. Need ${REQUIRED_WATCH_TIME} seconds to earn.`, 'warning');
                }
            }
        }
        
        // Initialize when page loads
        window.onload = () => {
            // Close modal when X is clicked
            document.getElementById('closeModal').addEventListener('click', function() {
                document.getElementById('videoModal').style.display = 'none';
                const videoPlayer = document.getElementById('modalVideoPlayer');
                videoPlayer.pause();
                videoPlayer.src = '';
                
                // Clear timer
                if (watchTimer) {
                    clearInterval(watchTimer);
                    watchTimer = null;
                }
                
                // If user didn't earn and watched some time, show message
                if (!hasEarnedFromCurrentVideo && secondsWatched > 0 && secondsWatched < REQUIRED_WATCH_TIME) {
                    showNotification(`You watched ${secondsWatched} seconds. Need ${REQUIRED_WATCH_TIME} seconds to earn.`, 'warning');
                }
            });
            
            // Close modal when clicking outside
            document.getElementById('videoModal').addEventListener('click', function(e) {
                if (e.target === this) {
                    document.getElementById('videoModal').style.display = 'none';
                    const videoPlayer = document.getElementById('modalVideoPlayer');
                    videoPlayer.pause();
                    videoPlayer.src = '';
                    
                    // Clear timer
                    if (watchTimer) {
                        clearInterval(watchTimer);
                        watchTimer = null;
                    }
                    
                    // If user didn't earn and watched some time, show message
                    if (!hasEarnedFromCurrentVideo && secondsWatched > 0 && secondsWatched < REQUIRED_WATCH_TIME) {
                        showNotification(`You watched ${secondsWatched} seconds. Need ${REQUIRED_WATCH_TIME} seconds to earn.`, 'warning');
                    }
                }
            });
            
            // Add event listener for video ended
            document.getElementById('modalVideoPlayer').addEventListener('ended', handleVideoEnded);
            
            // Check auth state
            auth.onAuthStateChanged(user => {
                if (user) {
                    // User is signed in
                    currentUser = user;
                    document.getElementById('userName').textContent = user.displayName || 'User';
                    document.getElementById('userEmail').textContent = user.email;
                    
                    // Load user data
                    database.ref(`users/${user.uid}`).on('value', (snapshot) => {
                        const data = snapshot.val();
                        if (data) {
                            console.log("User data loaded:", data);
                            
                            userData.balance = data.balance || 0;
                            userData.levels = data.levels || {};
                            userData.watchedVideos = data.watchedVideos || {};
                            userData.lastWatchedDate = data.lastWatchedDate || null;
                            
                            // DETERMINE CURRENT LEVEL CORRECTLY
                            userData.currentLevel = determineUserLevel(data.levels);
                            
                            console.log("Determined current level:", userData.currentLevel);
                            
                            // Update UI
                            document.getElementById('userBalance').textContent = formatAmount(userData.balance);
                            updateLevelDisplay();
                            loadVideosForLevel();
                        } else {
                            console.log("No user data found");
                        }
                    });
                } else {
                    // No user is signed in
                    showNotification('Please login to access this page', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            });
        };