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
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Function to determine current level (highest level user has)
function determineCurrentLevel(levels) {
    if (!levels) return null;
    
    const levelPrices = {
        'lite': 500000,
        'core': 1000000,
        'pro': 2000000,
        'max': 3000000
    };
    
    let highestLevel = null;
    let highestPrice = 0;
    
    for (const level in levels) {
        if (levels[level] && levelPrices[level] > highestPrice) {
            highestLevel = level;
            highestPrice = levelPrices[level];
        }
    }
    
    return highestLevel;
}

// Function to load upgrade history
function loadUpgradeHistory(userId) {
    const historyContainer = document.getElementById('historyContainer');
    historyContainer.innerHTML = '<div class="no-history">Loading your upgrade history...</div>';
    
    showLoading('Loading upgrade history...');
    
    database.ref(`upgradeHistory/${userId}`).orderByChild('timestamp').once('value')
        .then(snapshot => {
            hideLoading();
            
            if (!snapshot.exists()) {
                historyContainer.innerHTML = '<div class="no-history">No upgrade history found</div>';
                document.getElementById('historyCount').textContent = '0';
                return;
            }
            
            const historyData = [];
            snapshot.forEach(childSnapshot => {
                historyData.push(childSnapshot.val());
            });
            
            // Update count
            document.getElementById('historyCount').textContent = historyData.length;
            
            // Sort by timestamp descending (newest first)
            historyData.reverse();
            
            // Clear container
            historyContainer.innerHTML = '';
            
            // Add each history item
            historyData.forEach(history => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div>
                        <div class="history-level">
                            ${history.fromLevel ? `${history.fromLevel} → ` : 'Started at '}${history.toLevel}
                        </div>
                        <div class="history-date">${formatDate(history.timestamp)}</div>
                    </div>
                    <div class="history-amount">-${formatAmount(history.amount)}</div>
                `;
                historyContainer.appendChild(historyItem);
            });
        })
        .catch(error => {
            hideLoading();
            showNotification('Error loading upgrade history: ' + error.message, 'error');
        });
}

// Initialize when page loads
window.onload = async () => {
    // Check auth state
    auth.onAuthStateChanged(async user => {
        if (user) {
            // User is signed in
            currentUser = user;
            document.getElementById('userEmail').textContent = user.email;
            
            showLoading('Loading user data...');
            
            try {
                // Get user data to determine current level
                const userRef = database.ref(`users/${user.uid}`);
                userRef.once('value').then(snapshot => {
                    const userData = snapshot.val();
                    if (userData) {
                        // Determine current level
                        const currentLevel = determineCurrentLevel(userData.levels);
                        document.getElementById('currentLevel').textContent = currentLevel ? currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1) : 'None';
                    }
                    
                    // Load upgrade history
                    loadUpgradeHistory(user.uid);
                });
                
            } catch (error) {
                hideLoading();
                showNotification('Error loading user data: ' + error.message, 'error');
            }
        } else {
            // No user is signed in
            showNotification('Please login to access this page', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    });
};