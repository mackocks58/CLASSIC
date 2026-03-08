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
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Prevent double submission flag
let isSubmitting = false;

function showPopup(message, type) {
    const popup = document.getElementById('popup');
    const popupText = document.getElementById('popupText');
    const progressBar = popup.querySelector('.progress-bar');
    popupText.textContent = message;
    
    popup.className = `popup ${type} show`;
    progressBar.style.animationDuration = '3s';
    progressBar.style.animationName = 'countdown';
    
    setTimeout(() => {
        popup.classList.remove('show');
    }, 3000);
}
function validatePhoneNumber(phone) {
    // Simple validation - should start with + and have at least 9 digits
    return phone.length >= 10;
}
function showLoading(show) {
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    
    if (show) {
        btn.disabled = true;
        btnText.innerHTML = `<span class="spinner"></span> Verifying...`;
    } else {
        btn.disabled = false;
        btnText.textContent = 'Login as Admin';
    }
}



async function checkAdminRole(uid) {
    try {
        const roleRef = database.ref(`users/${uid}/role`);
        const snapshot = await roleRef.once('value');
        const role = snapshot.val();
        
        if (role === 'admin') {
            return true;
        } else {
            showPopup('❌ Access denied. Admin privileges required.', 'error');
            await auth.signOut(); // Log out non-admin users
            return false;
        }
    } catch (error) {
        console.error('Error checking admin role:', error);
        showPopup('❌ Error verifying permissions', 'error');
        return false;
    }
}

async function handleLogin() {
    if (isSubmitting) return;
    
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();

    // Validate inputs
    if (!phone || !password) {
        showPopup('❌ Please fill all fields', 'error');
        return;
    }
    
    if (!validatePhoneNumber(phone)) {
        showPopup('❌ Invalid phone number format. Include country code (+...)', 'error');
        return;
    }

    // Prevent double submission
    isSubmitting = true;
    showLoading(true);

    try {
        // Convert phone to email format (same as signup)
        const email = `${phone.replace('+', '')}@NewHope.com`;
        
        // Sign in with email/password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if user has admin role
        const isAdmin = await checkAdminRole(user.uid);
        
        if (isAdmin) {
            showPopup('✅ Admin access granted! Redirecting...', 'success');
            
            // Redirect to admin dashboard after 1 second
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1000);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed';
        
        if (error.code) {
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Phone number not registered';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid phone number format';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many attempts. Try again later';
                    break;
                default:
                    errorMessage = error.message || 'Login failed';
            }
        } else {
            errorMessage = error.message || 'Login failed';
        }
        
        showPopup(`❌ ${errorMessage}`, 'error');
        
        // Clear password field on error
        document.getElementById('password').value = '';
    } finally {
        isSubmitting = false;
        showLoading(false);
    }
}

// Allow login on Enter key press
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleLogin();
    }
});