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

// Format amount function
function formatAmount(amount) {
    if (!amount) return "BWP 0";
    return "BWP " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format date function
function formatDate(timestamp) {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US');
}

// Load commission data
function loadCommissionData(userId) {
    // Get user commission data
    database.ref(`users/${userId}/commissions`).once('value').then(snapshot => {
        const commissions = snapshot.val() || {};
        
        // Update commission boxes
        document.getElementById('level1Commissions').textContent = formatAmount(commissions.level1);
        document.getElementById('level2Commissions').textContent = formatAmount(commissions.level2);
        document.getElementById('level3Commissions').textContent = formatAmount(commissions.level3);
        document.getElementById('level4Commissions').textContent = formatAmount(commissions.level4);
        document.getElementById('level5Commissions').textContent = formatAmount(commissions.level5);
        
        // Calculate total commissions
        const total = (commissions.level1 || 0) + 
                      (commissions.level2 || 0) + 
                      (commissions.level3 || 0) + 
                      (commissions.level4 || 0) + 
                      (commissions.level5 || 0);
        
        document.getElementById('totalCommissions').textContent = formatAmount(total);
    });
    
    // Get referral counts for each level
    database.ref(`users/${userId}`).once('value').then(snapshot => {
        const userData = snapshot.val();
        
        const level1Count = userData.level1 ? Object.keys(userData.level1).length : 0;
        const level2Count = userData.level2 ? Object.keys(userData.level2).length : 0;
        const level3Count = userData.level3 ? Object.keys(userData.level3).length : 0;
        const level4Count = userData.level4 ? Object.keys(userData.level4).length : 0;
        const level5Count = userData.level5 ? Object.keys(userData.level5).length : 0;
        
        document.getElementById('level1Count').textContent = `Referrals: ${level1Count}`;
        document.getElementById('level2Count').textContent = `Referrals: ${level2Count}`;
        document.getElementById('level3Count').textContent = `Referrals: ${level3Count}`;
        document.getElementById('level4Count').textContent = `Referrals: ${level4Count}`;
        document.getElementById('level5Count').textContent = `Referrals: ${level5Count}`;
    });
    
    // Load commission history
    loadCommissionHistory(userId);
}



// Handle logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch(error => {
        console.error('Logout error:', error);
    });
});

// Check authentication state
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in, load their commission data
        loadCommissionData(user.uid);
    } else {
        // No user is signed in, redirect to login
        window.location.href = 'login.html';
    }
});