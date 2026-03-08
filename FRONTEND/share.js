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
        if (userData && userData.referralCode) {
            // Update referral code and link
            document.getElementById('referralCode').textContent = userData.referralCode;
            
            // Create the referral link
            const baseUrl = window.location.origin || 'https://newhope.company';
            const referralLink = `${baseUrl}?ref=${userData.referralCode}`;
            document.getElementById('referralLinkText').textContent = referralLink;
            
            // Set up share buttons
            setupShareButtons(referralLink);
        }
    }, (error) => {
        console.error("Error loading user data:", error);
    });
}

// Set up share buttons
function setupShareButtons(referralLink) {
    const message = "Join CLASSIC MAXIMIZE today! Start investing and earn high returns. Use this link to register: ";
    
    // Copy link button
    document.getElementById('copyLinkBtn').addEventListener('click', function() {
        navigator.clipboard.writeText(referralLink).then(() => {
            showToast("Link Copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback method for copying
            const textArea = document.createElement("textarea");
            textArea.value = referralLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            showToast("Link Copied!");
        });
    });
    
    // WhatsApp share
    document.getElementById('shareWhatsApp').addEventListener('click', function() {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message + referralLink)}`;
        window.open(whatsappUrl, '_blank');
    });
    
    // Facebook share
    document.getElementById('shareFacebook').addEventListener('click', function() {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
        window.open(facebookUrl, '_blank');
    });
    
    // Twitter share
    document.getElementById('shareTwitter').addEventListener('click', function() {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralLink)}`;
        window.open(twitterUrl, '_blank');
    });
    
    // SMS share
    document.getElementById('shareSMS').addEventListener('click', function() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            // Mobile device
            window.location.href = `sms:?body=${encodeURIComponent(message + referralLink)}`;
        } else {
            // Desktop - show prompt to copy message
            navigator.clipboard.writeText(message + referralLink).then(() => {
                showToast("Message copied! Send it to your friends via SMS..");
            });
        }
    });
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
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