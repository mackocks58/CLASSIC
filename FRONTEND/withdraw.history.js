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
        
        // Function to format date
        function formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            const date = new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
        
        // Function to update current time
        function updateCurrentTime() {
            const now = new Date();
            document.getElementById('currentTime').textContent = now.toLocaleString();
        }
        
        // Function to load withdrawal history
        function loadWithdrawalHistory(filter = 'all') {
            showLoading('Loading history...');
            
            if (!currentUser) {
                hideLoading();
                return;
            }
            
            const withdrawalsRef = database.ref('withdrawals').orderByChild('userId').equalTo(currentUser.uid);
            withdrawalsRef.on('value', (snapshot) => {
                const withdrawals = [];
                snapshot.forEach((childSnapshot) => {
                    const withdrawal = childSnapshot.val();
                    withdrawal.id = childSnapshot.key;
                    withdrawals.push(withdrawal);
                });
                
                // Sort by timestamp (newest first)
                withdrawals.sort((a, b) => b.timestamp - a.timestamp);
                
                // Filter withdrawals
                let filteredWithdrawals = withdrawals;
                
                if (filter !== 'all') {
                    filteredWithdrawals = withdrawals.filter(w => w.status === filter);
                }
                
                // Display withdrawals
                displayWithdrawals(filteredWithdrawals);
                hideLoading();
            }, (error) => {
                hideLoading();
                showNotification('Error loading history: ' + error.message, 'error');
            });
        }
        
        // Function to display withdrawals
        function displayWithdrawals(withdrawals) {
            const historyList = document.getElementById('historyList');
            
            if (withdrawals.length === 0) {
                historyList.innerHTML = '<div class="no-history">No withdrawal history found</div>';
                return;
            }
            
            historyList.innerHTML = '';
            
            withdrawals.forEach(withdrawal => {
                // Calculate amount after 13% fee
                const fee = withdrawal.amount * 0.13;
                const amountAfterFee = withdrawal.amount - fee;
                
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-header">
                        <div class="history-date">${formatDate(withdrawal.timestamp)}</div>
                        <div class="history-status status-${withdrawal.status}">${withdrawal.status}</div>
                    </div>
                    <div class="history-details">
                        <div class="detail-group">
                            <div class="detail-label">Amount Requested</div>
                            <div class="detail-value">${formatAmount(withdrawal.amount)}</div>
                        </div>
                        <div class="detail-group">
                            <div class="detail-label">Amount Received</div>
                            <div class="detail-value">${formatAmount(amountAfterFee)}</div>
                            <div class="amount-after-fee">(Fee: ${formatAmount(fee)} - 13%)</div>
                        </div>
                        <div class="detail-group">
                            <div class="detail-label">Network</div>
                            <div class="detail-value">${withdrawal.network}</div>
                        </div>
                        <div class="detail-group">
                            <div class="detail-label">Phone Number</div>
                            <div class="detail-value">${withdrawal.phoneNumber}</div>
                        </div>
                    </div>
                    ${withdrawal.processedAt ? `
                    <div style="margin-top: 10px; font-size: 12px; color: rgba(255,255,255,0.5);">
                        Processed: ${formatDate(withdrawal.processedAt)}
                    </div>
                    ` : ''}
                `;
                
                historyList.appendChild(historyItem);
            });
        }
        
        // Initialize when page loads
        window.onload = async () => {
            // Update current time every second
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);
            
            // Set up back button
            document.getElementById('backBtn').addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
            
            // Set up filter buttons
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const filter = btn.getAttribute('data-filter');
                    loadWithdrawalHistory(filter);
                });
            });
            
            // Check auth state
            auth.onAuthStateChanged(user => {
                if (user) {
                    // User is signed in
                    currentUser = user;
                    document.getElementById('userInitial').textContent = user.email.charAt(0).toUpperCase();
                    
                    // Load withdrawal history
                    loadWithdrawalHistory();
                    
                } else {
                    // No user is signed in
                    showNotification('Please login to view your history', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            });
        };