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

// Check if user is logged in
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        // Load user data
        loadUserData(user.uid);
    }
});

// Load user data from Firebase
function loadUserData(userId) {
    const userRef = database.ref('users/' + userId);
    
    userRef.on('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            // Calculate counts for each level
            const level1Count = userData.level1 ? Object.keys(userData.level1).length : 0;
            const level2Count = userData.level2 ? Object.keys(userData.level2).length : 0;
            const level3Count = userData.level3 ? Object.keys(userData.level3).length : 0;
            const level4Count = userData.level4 ? Object.keys(userData.level4).length : 0;
            const level5Count = userData.level5 ? Object.keys(userData.level5).length : 0;
            
            // Calculate total referrals
            const totalReferrals = level1Count + level2Count + level3Count + level4Count + level5Count;
            
            // Update the UI
            document.getElementById('totalReferrals').textContent = totalReferrals;
            document.getElementById('level1Count').textContent = level1Count;
            document.getElementById('level2Count').textContent = level2Count;
            document.getElementById('level3Count').textContent = level3Count;
            document.getElementById('level4Count').textContent = level4Count;
            document.getElementById('level5Count').textContent = level5Count;
        }
    }, (error) => {
        console.error("Error loading user data:", error);
    });
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    auth.signOut().then(() => {
        window.location.href = "login.html";
    }).catch((error) => {
        console.error("Logout error:", error);
    });
});