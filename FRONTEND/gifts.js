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
        
        // User data
        let currentUser = null;
        let userData = {
            giftPoints: 0,
            freeTasksCompleted: {},
            lastTaskDate: null
        };
        
        // Daily tasks (10 videos per day)
        const dailyTasks = [
            { id: 'video1', title: 'Watch Video 1', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video2', title: 'Watch Video 2', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video3', title: 'Watch Video 3', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video4', title: 'Watch Video 4', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video5', title: 'Watch Video 5', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video6', title: 'Watch Video 6', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video7', title: 'Watch Video 7', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video8', title: 'Watch Video 8', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video9', title: 'Watch Video 9', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' },
            { id: 'video10', title: 'Watch Video 10', description: 'Watch this short video for 10 seconds', points: 2, icon: 'fa-play-circle' }
        ];
        
        // Video URLs for demo
        const videoUrls = [
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
        ];

        // Video tracking variables
        let currentTaskId = null;
        let currentTaskIndex = null;
        let videoTimer = null;
        let secondsLeft = 10;
        let isVideoPlaying = false;
        let hasEarnedPoints = false;
        let videoElement = null;
        
        // Show loading
        function showLoading() {
            document.getElementById('loadingOverlay').style.display = 'flex';
        }
        
        // Hide loading
        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
        
        // Show notification
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            const text = document.getElementById('notificationText');
            
            text.textContent = message;
            
            // Set color based on type
            if (type === 'success') {
                notification.style.background = 'rgba(0, 255, 136, 0.9)';
                notification.style.color = '#000';
            } else if (type === 'error') {
                notification.style.background = 'rgba(255, 0, 85, 0.9)';
                notification.style.color = '#fff';
            } else if (type === 'warning') {
                notification.style.background = 'rgba(255, 170, 0, 0.9)';
                notification.style.color = '#000';
            }
            
            notification.style.display = 'flex';
            
            // Hide after 3 seconds
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
        
        // Check if task was completed today
        function isTaskCompletedToday(taskId) {
            if (!userData.freeTasksCompleted || !userData.freeTasksCompleted[taskId]) {
                return false;
            }
            
            // Check if we have a new day (reset tasks)
            const today = new Date().toDateString();
            if (userData.lastTaskDate !== today) {
                // New day, reset completed tasks
                userData.freeTasksCompleted = {};
                userData.lastTaskDate = today;
                return false;
            }
            
            return userData.freeTasksCompleted[taskId] === today;
        }
        
        // Count completed tasks today
        function countCompletedTasksToday() {
            if (!userData.freeTasksCompleted) return 0;
            
            const today = new Date().toDateString();
            if (userData.lastTaskDate !== today) {
                return 0; // New day
            }
            
            return Object.values(userData.freeTasksCompleted).filter(date => date === today).length;
        }
        
        // Update user points display
        function updatePointsDisplay() {
            document.getElementById('giftPoints').textContent = userData.giftPoints;
            
            const completedTasks = countCompletedTasksToday();
            document.getElementById('dailyProgress').textContent = `${completedTasks}/${dailyTasks.length} tasks completed`;
        }
        
        // Load tasks
        function loadTasks() {
            const tasksGrid = document.getElementById('tasksGrid');
            tasksGrid.innerHTML = '';
            
            const completedTasks = countCompletedTasksToday();
            
            dailyTasks.forEach((task, index) => {
                const isCompleted = isTaskCompletedToday(task.id);
                
                const taskCard = document.createElement('div');
                taskCard.className = `task-card ${isCompleted ? 'completed' : ''}`;
                
                taskCard.innerHTML = `
                    <div class="task-header">
                        <div class="task-icon">
                            <i class="fas ${task.icon}"></i>
                        </div>
                        <div class="task-reward">
                            <i class="fas fa-coins"></i>
                            ${task.points} Gift Points
                        </div>
                    </div>
                    <div class="task-title">${task.title}</div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-timer">
                        <i class="fas fa-clock"></i>
                        Requires 10 seconds watching
                    </div>
                    <button class="task-btn ${isCompleted ? 'completed' : (completedTasks >= dailyTasks.length ? 'disabled' : 'available')}" 
                            data-task-id="${task.id}" 
                            data-task-index="${index}"
                            ${isCompleted || completedTasks >= dailyTasks.length ? 'disabled' : ''}>
                        <i class="fas ${isCompleted ? 'fa-check-circle' : 'fa-play'}"></i>
                        ${isCompleted ? 'Task Completed' : (completedTasks >= dailyTasks.length ? 'Daily Limit Reached' : 'Watch Video Now')}
                    </button>
                `;
                
                tasksGrid.appendChild(taskCard);
            });
            
            // Add click events to task buttons
            document.querySelectorAll('.task-btn.available').forEach(btn => {
                btn.addEventListener('click', function() {
                    const taskId = this.getAttribute('data-task-id');
                    const taskIndex = this.getAttribute('data-task-index');
                    startVideoTask(taskId, parseInt(taskIndex));
                });
            });
        }

        // Start countdown timer
        function startCountdown() {
            const timerElement = document.getElementById('videoTimer');
            const progressFill = document.getElementById('progressFill');
            
            if (videoTimer) {
                clearInterval(videoTimer);
            }
            
            secondsLeft = 10;
            isVideoPlaying = true;
            
            // Update timer display immediately
            timerElement.textContent = secondsLeft;
            progressFill.style.width = '0%';
            
            videoTimer = setInterval(() => {
                if (!isVideoPlaying || videoElement.paused || videoElement.ended) {
                    // Video is paused or ended, stop counting
                    return;
                }
                
                secondsLeft--;
                timerElement.textContent = secondsLeft;
                
                // Update progress bar
                const progress = ((10 - secondsLeft) / 10) * 100;
                progressFill.style.width = `${progress}%`;
                
                if (secondsLeft <= 0) {
                    clearInterval(videoTimer);
                    videoTimer = null;
                    completeVideoTask();
                }
            }, 1000);
        }

        // Stop countdown timer
        function stopCountdown() {
            if (videoTimer) {
                clearInterval(videoTimer);
                videoTimer = null;
            }
            isVideoPlaying = false;
        }

        // Create video modal
        function createVideoModal() {
            const modal = document.getElementById('videoModal');
            modal.innerHTML = '';
            
            videoElement = document.createElement('video');
            videoElement.controls = true;
            videoElement.autoplay = true;
            
            // Timer container
            const timerContainer = document.createElement('div');
            timerContainer.className = 'timer-container hidden';
            timerContainer.id = 'timerContainer';
            
            const timerIcon = document.createElement('i');
            timerIcon.className = 'fas fa-clock';
            
            const timerText = document.createElement('span');
            timerText.textContent = 'Time remaining: ';
            
            const timerCount = document.createElement('span');
            timerCount.id = 'videoTimer';
            timerCount.textContent = '10';
            
            const timerSeconds = document.createElement('span');
            timerSeconds.textContent = ' seconds';
            
            timerContainer.appendChild(timerIcon);
            timerContainer.appendChild(timerText);
            timerContainer.appendChild(timerCount);
            timerContainer.appendChild(timerSeconds);
            
            // Progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressFill.id = 'progressFill';
            
            progressBar.appendChild(progressFill);
            timerContainer.appendChild(progressBar);
            
            // Waiting message
            const waitingMessage = document.createElement('div');
            waitingMessage.className = 'waiting-message';
            waitingMessage.id = 'waitingMessage';
            waitingMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for video to start...';
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-video-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Task';
            
            modal.appendChild(videoElement);
            modal.appendChild(timerContainer);
            modal.appendChild(waitingMessage);
            modal.appendChild(closeBtn);
            
            return { modal, videoElement, timerContainer, waitingMessage, closeBtn };
        }
        
        // Start video task
        function startVideoTask(taskId, taskIndex) {
            showLoading();
            
            currentTaskId = taskId;
            currentTaskIndex = taskIndex;
            hasEarnedPoints = false;
            
            // Create modal
            const { modal, videoElement, timerContainer, waitingMessage, closeBtn } = createVideoModal();
            
            // Use different video for each task
            const videoUrl = videoUrls[taskIndex % videoUrls.length];
            videoElement.src = videoUrl;
            
            // Show modal
            modal.style.display = 'flex';
            hideLoading();
            
            // Video event listeners
            videoElement.addEventListener('playing', () => {
                // Video started playing, show timer and hide waiting message
                timerContainer.classList.remove('hidden');
                waitingMessage.style.display = 'none';
                startCountdown();
            });
            
            videoElement.addEventListener('pause', () => {
                // Video paused, stop countdown
                stopCountdown();
                waitingMessage.innerHTML = '<i class="fas fa-pause"></i> Video paused - timer stopped';
                waitingMessage.style.display = 'flex';
            });
            
            videoElement.addEventListener('play', () => {
                // Video resumed playing
                if (secondsLeft > 0 && !hasEarnedPoints) {
                    waitingMessage.style.display = 'none';
                    startCountdown();
                }
            });
            
            videoElement.addEventListener('ended', () => {
                // Video ended
                stopCountdown();
                if (secondsLeft > 0 && !hasEarnedPoints) {
                    // Video ended before countdown finished
                    showNotification('Video ended before completing 10 seconds. Please try again.', 'warning');
                    closeVideoModal();
                }
            });
            
            videoElement.addEventListener('error', (e) => {
                // Video error (network issue, etc.)
                stopCountdown();
                showNotification('Video loading error. Please check your connection.', 'error');
                console.error('Video error:', e);
            });
            
            // Close button event
            closeBtn.addEventListener('click', closeVideoModal);
            
            // Close modal when clicking outside video
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeVideoModal();
                }
            });
        }

        // Close video modal
        function closeVideoModal() {
            stopCountdown();
            
            const modal = document.getElementById('videoModal');
            modal.style.display = 'none';
            
            if (videoElement) {
                videoElement.pause();
                videoElement.src = '';
                videoElement = null;
            }
            
            // Reset variables
            currentTaskId = null;
            currentTaskIndex = null;
            secondsLeft = 10;
            isVideoPlaying = false;
            
            if (!hasEarnedPoints && secondsLeft < 10) {
                showNotification('Task cancelled. Progress was not saved.', 'warning');
            }
        }

        // Complete video task and award points
        function completeVideoTask() {
            if (hasEarnedPoints) return; // Prevent double earning
            
            hasEarnedPoints = true;
            stopCountdown();
            
            // Update database
            const today = new Date().toDateString();
            const updates = {};
            
            // Add gift points
            const newGiftPoints = userData.giftPoints + 2;
            updates[`users/${currentUser.uid}/giftPoints`] = newGiftPoints;
            
            // Mark task as completed
            updates[`users/${currentUser.uid}/freeTasksCompleted/${currentTaskId}`] = today;
            updates[`users/${currentUser.uid}/lastTaskDate`] = today;
            
            // Record transaction
            const transactionData = {
                userId: currentUser.uid,
                type: 'gift_points',
                taskId: currentTaskId,
                points: 2,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                date: today,
                watchTime: 10
            };
            
            const transactionRef = database.ref('giftTransactions').push();
            updates[`giftTransactions/${transactionRef.key}`] = transactionData;
            
            database.ref().update(updates)
                .then(() => {
                    // Update local data
                    userData.giftPoints = newGiftPoints;
                    userData.freeTasksCompleted[currentTaskId] = today;
                    userData.lastTaskDate = today;
                    
                    // Show success in modal
                    const modal = document.getElementById('videoModal');
                    const successMessage = document.createElement('div');
                    successMessage.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(0, 255, 136, 0.9);
                        color: #000;
                        padding: 30px 50px;
                        border-radius: 20px;
                        text-align: center;
                        z-index: 10;
                        font-size: 24px;
                        font-weight: bold;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    `;
                    successMessage.innerHTML = `
                        <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 15px;"></i><br>
                        🎉 Task Completed!<br>
                        <span style="font-size: 18px;">You earned 2 Gift Points!</span>
                    `;
                    
                    modal.appendChild(successMessage);
                    
                    // Close modal after 2 seconds and update UI
                    setTimeout(() => {
                        modal.style.display = 'none';
                        if (videoElement) {
                            videoElement.pause();
                            videoElement.src = '';
                        }
                        modal.innerHTML = '';
                        
                        // Update UI
                        updatePointsDisplay();
                        loadTasks();
                        
                        // Show notification
                        showNotification(`Congratulations! You earned 2 Gift Points! Total: ${newGiftPoints} points`);
                    }, 2000);
                })
                .catch(error => {
                    showNotification('Error completing task: ' + error.message, 'error');
                    closeVideoModal();
                });
        }
        
        // Initialize page
        window.onload = () => {
            // Convert button event
            document.getElementById('convertBtn').addEventListener('click', () => {
                window.location.href = 'convert.html';
            });
            
            // Check auth
            auth.onAuthStateChanged(user => {
                if (user) {
                    currentUser = user;
                    
                    // Load user data
                    database.ref(`users/${user.uid}`).on('value', (snapshot) => {
                        const data = snapshot.val();
                        if (data) {
                            userData.giftPoints = data.giftPoints || 0;
                            userData.freeTasksCompleted = data.freeTasksCompleted || {};
                            userData.lastTaskDate = data.lastTaskDate || null;
                            
                            // Check if new day
                            const today = new Date().toDateString();
                            if (userData.lastTaskDate !== today) {
                                // Reset for new day
                                userData.freeTasksCompleted = {};
                                userData.lastTaskDate = today;
                            }
                            
                            updatePointsDisplay();
                            loadTasks();
                        }
                    });
                } else {
                    // Redirect to login
                    window.location.href = 'login.html';
                }
            });
        };