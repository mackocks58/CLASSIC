// Firebase config (exactly as original)
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
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();

        // Elements
        const phoneDigitsInput = document.getElementById('phoneDigits');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');
        const floatingMessage = document.getElementById('floatingMessage');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const phoneErrorInline = document.getElementById('phoneErrorInline');

        // Botswana phone validation: exactly 8 digits, starts with 7
        function isValidBotswanaPhone(digits) {
            return /^7\d{7}$/.test(digits);
        }

        // Show floating message
        function showMessage(text, isSuccess = false) {
            floatingMessage.textContent = text;
            floatingMessage.classList.toggle('success', isSuccess);
            floatingMessage.classList.add('show');
            setTimeout(() => {
                floatingMessage.classList.remove('show');
            }, 4000);
        }

        // Real-time validation (with inline error)
        function validateForm() {
            const phoneDigits = phoneDigitsInput.value;
            const password = passwordInput.value;

            let phoneValid = phoneDigits.length === 0 || isValidBotswanaPhone(phoneDigits);
            let passwordValid = password.length >= 6;

            // show inline phone error only when there's input and it's invalid
            if (phoneDigits.length > 0 && !phoneValid) {
                phoneErrorInline.classList.add('show');
            } else {
                phoneErrorInline.classList.remove('show');
            }

            const allValid = phoneValid && passwordValid && phoneDigits.length === 8 && password.length >= 6;
            loginBtn.disabled = !allValid;
        }

        phoneDigitsInput.addEventListener('input', validateForm);
        passwordInput.addEventListener('input', validateForm);

        // Login submission
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const phoneDigits = phoneDigitsInput.value;
            if (!isValidBotswanaPhone(phoneDigits)) {
                showMessage('Invalid Botswana number! Use 8 digits starting with 7.');
                return;
            }

            const password = passwordInput.value;
            if (password.length < 6) {
                showMessage('Password must be at least 6 characters.');
                return;
            }

            loadingOverlay.style.display = 'flex';

            try {
                // Construct email as "267xxxxxxx@NewHope.com" (original logic)
                const fullPhoneDigits = '267' + phoneDigits;
                const email = `${fullPhoneDigits}@NewHope.com`;

                await auth.signInWithEmailAndPassword(email, password);
                loadingOverlay.style.display = 'none';
                showMessage('Login successful! Redirecting...', true);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } catch (error) {
                loadingOverlay.style.display = 'none';
                let errorMessage = 'Login failed. Please try again.';
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'User not found. Please register first.';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Invalid mobile number.';
                }
                showMessage(errorMessage);
            }
        });

        // Initially disable button
        loginBtn.disabled = true;

        // add smooth focus effect (like music example)
        document.querySelectorAll('.input-box input').forEach(input => {
            input.addEventListener('focus', () => {
                input.closest('.input-box').style.boxShadow = '0 0 15px rgba(72,198,239,0.5)';
            });
            input.addEventListener('blur', () => {
                input.closest('.input-box').style.boxShadow = 'none';
            });
        });