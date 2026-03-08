// FUNCTIONALITY CODE - EXACTLY THE SAME AS BEFORE
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
        
        // Global variables
        let currentUser = null;
        let userDeposits = [];
        
        // Function to show notification
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            let icon = '';
            if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
            else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
            else if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';
            
            notification.innerHTML = `${icon} ${message}`;
            
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
            if (!amount) return "BWP 0";
            return "BWP " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        
        // Function to format date
        function formatDate(timestamp) {
            if (!timestamp) return "N/A";
            const date = new Date(timestamp);
            const options = { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return date.toLocaleDateString('en-US', options);
        }
        
        // Function to get status text in Swahili
        function getStatusText(status) {
            switch(status) {
                case 'approved': return 'Approved';
                case 'pending': return 'Pending';
                case 'rejected': return 'Rejected';
                default: return status;
            }
        }
        
        // Function to load deposit history
        function loadDepositHistory(userId) {
            showLoading('Loading your deposits...');
            
            // Get user deposits from payments table
            database.ref('payments').orderByChild('userId').equalTo(userId).once('value')
                .then(snapshot => {
                    userDeposits = [];
                    
                    snapshot.forEach(childSnapshot => {
                        const deposit = {
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        };
                        userDeposits.push(deposit);
                    });
                    
                    // Sort by timestamp (newest first)
                    userDeposits.sort((a, b) => b.timestamp - a.timestamp);
                    
                    // Update UI
                    updateDepositStats();
                    renderDepositsTable();
                    
                    hideLoading();
                })
                .catch(error => {
                    hideLoading();
                    console.error('Error loading deposit history:', error);
                    showNotification('Error loading deposit history', 'error');
                });
        }
        
        // Function to update deposit statistics
        function updateDepositStats() {
            // Calculate totals
            let totalDeposits = 0;
            let totalCount = userDeposits.length;
            let approvedCount = 0;
            let pendingCount = 0;
            let rejectedCount = 0;
            
            userDeposits.forEach(deposit => {
                if (deposit.status === 'approved') {
                    totalDeposits += deposit.amount || 0;
                    approvedCount++;
                } else if (deposit.status === 'pending') {
                    pendingCount++;
                } else if (deposit.status === 'rejected') {
                    rejectedCount++;
                }
            });
            
            // Update UI
            document.getElementById('totalDeposits').textContent = formatAmount(totalDeposits);
            document.getElementById('totalCount').textContent = totalCount;
            document.getElementById('approvedCount').textContent = approvedCount;
            document.getElementById('pendingCount').textContent = pendingCount;
            document.getElementById('rejectedCount').textContent = rejectedCount;
        }
        
        // Function to render deposits table
        function renderDepositsTable() {
            const tableBody = document.getElementById('depositsTableBody');
            
            if (userDeposits.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            <div class="empty-state">
                                <div class="empty-icon">
                                    <i class="fas fa-inbox"></i>
                                </div>
                                <h3>You dont have any deposit</h3>
                                <p>You dont have any deposit. Deposit now.</p>
                                <a href="deposit.html" class="action-button">
                                    <i class="fas fa-plus-circle"></i> Make first Deposit
                                </a>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tableBody.innerHTML = '';
            
            userDeposits.forEach(deposit => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td style="font-weight: 500;">${formatDate(deposit.timestamp)}</td>
                    <td style="font-weight: 500;">${deposit.network || 'N/A'}</td>
                    <td style="font-weight: 700; color: var(--gold);">${formatAmount(deposit.amount)}</td>
                    <td style="font-weight: 500;">${deposit.phone || 'N/A'}</td>
                    <td>
                        <span class="status-badge status-${deposit.status}">
                            ${getStatusText(deposit.status)}
                        </span>
                    </td>
                    <td style="color: rgba(255, 255, 255, 0.7);">
                        ${deposit.status === 'rejected' && deposit.rejectionReason ? 
                          deposit.rejectionReason : 
                          deposit.proofType === 'transaction_id' ? 
                          `ID: ${deposit.transactionId || 'N/A'}` : 
                          'N/A'}
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        }
        
        // Function to create background particles
        function createBackgroundParticles() {
            const container = document.getElementById('bgParticles');
            const particleCount = window.innerWidth < 768 ? 40 : 80;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                
                const size = Math.random() * 4 + 1;
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                
                particle.style.left = `${Math.random() * 100}%`;
                particle.style.animationDelay = `${Math.random() * 20}s`;
                particle.style.animationDuration = `${15 + Math.random() * 15}s`;
                
                container.appendChild(particle);
            }
        }
        
        // Handle logout
        document.getElementById('logoutBtn').addEventListener('click', function(e) {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            }).catch(error => {
                console.error('Logout error:', error);
                showNotification('Server error', 'error');
            });
        });
        
        // Check authentication state
        auth.onAuthStateChanged(user => {
            if (user) {
                // User is signed in, load their deposit history
                currentUser = user;
                loadDepositHistory(user.uid);
                
                // Set up real-time listener for deposit updates
                database.ref('payments').orderByChild('userId').equalTo(user.uid).on('child_changed', (snapshot) => {
                    const updatedDeposit = {
                        id: snapshot.key,
                        ...snapshot.val()
                    };
                    
                    // Update the deposit in our array
                    const index = userDeposits.findIndex(d => d.id === updatedDeposit.id);
                    if (index !== -1) {
                        userDeposits[index] = updatedDeposit;
                    } else {
                        userDeposits.push(updatedDeposit);
                    }
                    
                    // Re-sort and update UI
                    userDeposits.sort((a, b) => b.timestamp - a.timestamp);
                    updateDepositStats();
                    renderDepositsTable();
                    
                    // Show notification if status changed to approved
                    if (updatedDeposit.status === 'approved') {
                        showNotification(`Deposit of ${formatAmount(updatedDeposit.amount)} Approved`, 'success');
                    }
                });
                
            } else {
                // No user is signed in, redirect to login
                window.location.href = 'login.html';
            }
        });

        // Initialize background particles
        document.addEventListener('DOMContentLoaded', function() {
            createBackgroundParticles();
        });