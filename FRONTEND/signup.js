// Firebase config - Auth only (data goes through API)
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
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const phoneDigitsInput = document.getElementById('phoneDigits');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');
const referralInput = document.getElementById('referralCode');
const strengthBar = document.getElementById('strengthBar');
const phoneErrorInline = document.getElementById('phoneErrorInline');
const passwordErrorInline = document.getElementById('passwordErrorInline');
const signupBtn = document.getElementById('signupBtn');
const floatingMessage = document.getElementById('floatingMessage');
const loadingOverlay = document.getElementById('loadingOverlay');
const modal = document.getElementById('modal');

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get('ref');
    if (refFromUrl) referralInput.value = refFromUrl;
})();

function showMessage(text, isSuccess = false) {
    floatingMessage.textContent = text;
    floatingMessage.classList.toggle('success', isSuccess);
    floatingMessage.classList.add('show');
    setTimeout(() => floatingMessage.classList.remove('show'), 4000);
}

function isValidBotswanaPhone(digits) {
    return /^7\d{7}$/.test(digits);
}

function validateForm() {
    const phoneDigits = phoneDigitsInput.value;
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    let phoneValid = phoneDigits.length === 0 || isValidBotswanaPhone(phoneDigits);
    let passwordsMatch = confirm.length === 0 || password === confirm;
    let passwordLengthOk = password.length === 0 || password.length >= 6;
    if (phoneDigits.length > 0 && !phoneValid) phoneErrorInline.classList.add('show');
    else phoneErrorInline.classList.remove('show');
    if (confirm.length > 0 && !passwordsMatch) passwordErrorInline.classList.add('show');
    else passwordErrorInline.classList.remove('show');
    const allValid = phoneValid && passwordsMatch && passwordLengthOk &&
        phoneDigits.length === 8 && password.length >= 6 && confirm.length >= 6;
    signupBtn.disabled = !allValid;
}

phoneDigitsInput.addEventListener('input', validateForm);
passwordInput.addEventListener('input', function() {
    const pwd = this.value;
    let strength = 0;
    if (pwd.length > 7) strength += 30;
    if (pwd.match(/[0-9]/)) strength += 20;
    if (pwd.match(/[!@#$%^&*(),.?":{}|<>]/)) strength += 30;
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) strength += 20;
    strengthBar.style.width = Math.min(strength, 100) + '%';
    validateForm();
});
confirmInput.addEventListener('input', validateForm);

document.getElementById('signupBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    const phoneDigits = phoneDigitsInput.value;
    if (!isValidBotswanaPhone(phoneDigits)) {
        showMessage('Invalid Botswana number! Use 8 digits starting with 7.');
        return;
    }
    if (passwordInput.value.length < 6) {
        showMessage('Password must be at least 6 characters.');
        return;
    }
    if (passwordInput.value !== confirmInput.value) {
        showMessage('Passwords do not match.');
        return;
    }
    const enteredReferralCode = referralInput.value.trim() || null;
    loadingOverlay.style.display = 'flex';

    try {
        const fullPhone = '+267' + phoneDigits;
        const email = phoneDigits + '@classic.com';

        if (window.ClassicAPI) {
            await ClassicAPI.auth.register({
                email,
                password: passwordInput.value,
                phone: fullPhone,
                referralCode: enteredReferralCode
            });
        } else {
            const userCredential = await auth.createUserWithEmailAndPassword(email, passwordInput.value);
            const user = userCredential.user;
            const newRefCode = 'NEW' + Math.random().toString(36).substr(2, 8).toUpperCase();
            const userData = {
                phone: fullPhone,
                phoneDigits,
                level1: [], level2: [], level3: [], level4: [], level5: [],
                balance: 0, profit: 0, deposited: 0, totalEarnings: 0,
                signupDate: new Date().toISOString(),
                referralCode: newRefCode,
                referrer: null,
                referrerCode: enteredReferralCode
            };
            const database = firebase.database();
            if (enteredReferralCode) {
                const refSnap = await database.ref('users').orderByChild('referralCode').equalTo(enteredReferralCode).once('value');
                if (refSnap.exists()) {
                    const referrerId = Object.keys(refSnap.val())[0];
                    userData.referrer = referrerId;
                    await database.ref('users/' + user.uid).set(userData);
                    for (let i = 0, cid = referrerId; i < 5 && cid; i++) {
                        await database.ref('users/' + cid + '/level' + (i + 1)).push(user.uid);
                        const s = await database.ref('users/' + cid).once('value');
                        cid = s.val()?.referrer || null;
                    }
                } else {
                    await database.ref('users/' + user.uid).set(userData);
                }
            } else {
                await database.ref('users/' + user.uid).set(userData);
            }
        }

        await auth.signInWithEmailAndPassword(email, passwordInput.value);
        loadingOverlay.style.display = 'none';
        showMessage('Account created successfully! Redirecting...', true);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
    } catch (error) {
        loadingOverlay.style.display = 'none';
        if (error.code === 'auth/email-already-in-use' || (error.message && error.message.includes('already'))) {
            showMessage('This phone number is already registered.');
        } else {
            showMessage(error.message || 'Registration failed.');
        }
    }
});

signupBtn.disabled = true;

function openModal() { modal.classList.add('active'); }
function closeModal() { modal.classList.remove('active'); }
setTimeout(openModal, 3000);
window.onclick = function(e) { if (e.target === modal) closeModal(); };

document.querySelectorAll('.input-box input').forEach(input => {
    input.addEventListener('focus', () => input.closest('.input-box').style.boxShadow = '0 0 15px rgba(72,198,239,0.5)');
    input.addEventListener('blur', () => input.closest('.input-box').style.boxShadow = 'none');
});
