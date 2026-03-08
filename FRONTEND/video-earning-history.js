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
        
        // Current user data
        let currentUser = null;
        
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
        
        // Function to format amount
        function formatAmount(amount) {
            return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' BWP';
        }
        
        // Function to format date
        function formatDate(timestamp) {
            if (!timestamp) return 'Date not available';
            
            const date = new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Function to capitalize first letter
        function capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
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
        
        // Function to load earnings history
        function loadEarningsHistory() {
            showLoading('Loading earnings history...');
            
            database.ref('transactions')
                .orderByChild('userId')
                .equalTo(currentUser.uid)
                .once('value')
                .then((snapshot) => {
                    const transactions = snapshot.val();
                    const earningsList = document.getElementById('earningsList');
                    earningsList.innerHTML = '';
                    
                    if (!transactions) {
                        document.getElementById('noEarningsMessage').style.display = 'block';
                        hideLoading();
                        return;
                    }
                    
                    // Convert to array and sort by timestamp (newest first)
                    const transactionsArray = Object.entries(transactions)
                        .map(([id, transaction]) => ({ id, ...transaction }))
                        .sort((a, b) => b.timestamp - a.timestamp);
                    
                    if (transactionsArray.length === 0) {
                        document.getElementById('noEarningsMessage').style.display = 'block';
                        hideLoading();
                        return;
                    }
                    
                    let hasEarnings = false;
                    
                    transactionsArray.forEach(transaction => {
                        if (transaction.type !== 'video_earning') return;
                        hasEarnings = true;
                        
                        const card = document.createElement('div');
                        card.className = 'earning-card';
                        
                        // Format description based on transaction
                        let description = 'Earnings from watching a video';
                        if (transaction.videoId) {
                            description = `Earnings from video ${transaction.videoId.substring(0, 6)}`;
                        }
                        
                        card.innerHTML = `
                            <div class="earning-header">
                                <div class="earning-date">${formatDate(transaction.timestamp)}</div>
                                <div class="earning-amount">+${formatAmount(transaction.amount)}</div>
                            </div>
                            <div class="earning-details">
                                <span class="earning-level">${capitalize(transaction.level || 'unknown')} Level</span>
                                <div class="earning-description">${description}</div>
                            </div>
                        `;
                        
                        earningsList.appendChild(card);
                    });
                    
                    if (!hasEarnings) {
                        document.getElementById('noEarningsMessage').style.display = 'block';
                    }
                    
                    hideLoading();
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('Error loading earnings history: ' + error.message, 'error');
                    console.error('Error loading earnings history:', error);
                });
        }
        
        // Initialize when page loads
        window.onload = () => {
            // Check auth state
            auth.onAuthStateChanged(user => {
                if (user) {
                    // User is signed in
                    currentUser = user;
                    
                    // Update user info
                    document.getElementById('userName').textContent = user.displayName || 'User';
                    document.getElementById('userEmail').textContent = user.email;
                    
                    // Load user balance
                    database.ref(`users/${user.uid}/balance`).once('value')
                        .then((snapshot) => {
                            const balance = snapshot.val() || 0;
                            document.getElementById('userBalance').textContent = formatAmount(balance);
                        });
                    
                    // Load earnings history
                    loadEarningsHistory();
                } else {
                    // No user is signed in
                    showNotification('Please login to access this page', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            });
        };