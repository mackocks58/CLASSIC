// Firebase Configuration (update with your Botswana project if needed)
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
        let hasWithdrawalAccount = false;

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

        // Function to show password modal
        function showPasswordModal() {
            document.getElementById('passwordModal').style.display = 'flex';
            document.getElementById('password').focus();
        }

        // Function to hide password modal
        function hidePasswordModal() {
            document.getElementById('passwordModal').style.display = 'none';
            document.getElementById('password').value = '';
        }

        // Function to verify password
        async function verifyPassword() {
            const password = document.getElementById('password').value;
            
            if (!password) {
                showNotification('Please enter your password', 'error');
                return false;
            }
            
            showLoading('Verifying password...');
            
            try {
                // Reauthenticate user
                const credential = firebase.auth.EmailAuthProvider.credential(
                    currentUser.email, 
                    password
                );
                
                await currentUser.reauthenticateWithCredential(credential);
                
                hideLoading();
                hidePasswordModal();
                return true;
                
            } catch (error) {
                hideLoading();
                showNotification('Incorrect password. Please try again.', 'error');
                return false;
            }
        }

        // Function to save withdrawal account
        async function saveWithdrawalAccount() {
            const fullName = document.getElementById('fullName').value.trim();
            const network = document.getElementById('network').value;
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            
            // Validate inputs
            if (!fullName) {
                showNotification('Please enter your full name (3 names)', 'error');
                return;
            }
            
            // Check if name has at least 3 parts
            const nameParts = fullName.split(/\s+/).filter(part => part.length > 0);
            if (nameParts.length < 3) {
                showNotification('Please enter 3 names separated by spaces', 'error');
                return;
            }
            
            if (!network) {
                showNotification('Please select a mobile network', 'error');
                return;
            }
            
            if (!phoneNumber) {
                showNotification('Please enter your phone number', 'error');
                return;
            }
            
            // Validate Botswana phone number (8 digits starting with 7)
            const cleanedPhone = phoneNumber.replace(/\D/g, '');
            const botswanaRegex = /^(7\d{7})$/; // exactly 8 digits starting with 7
            if (!botswanaRegex.test(cleanedPhone)) {
                showNotification('Please enter a valid Botswana number (8 digits starting with 7, e.g., 71234567)', 'error');
                return;
            }
            
            // Format phone number to standard with country code +267
            let formattedPhone = '+267' + cleanedPhone; // cleanedPhone is 8 digits starting with 7
            
            // Show password verification
            showPasswordModal();
            
            // Wait for password verification
            document.getElementById('verifyPasswordBtn').onclick = async function() {
                const verified = await verifyPassword();
                if (!verified) return;
                
                showLoading('Saving withdrawal account...');
                
                try {
                    // Prepare withdrawal account data
                    const withdrawalData = {
                        fullName: fullName,
                        network: network,
                        phoneNumber: formattedPhone,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    
                    // Save to database
                    await database.ref(`users/${currentUser.uid}/withdrawalAccount`).set(withdrawalData);
                    
                    // Update UI
                    hasWithdrawalAccount = true;
                    document.getElementById('saveBtn').textContent = 'Edit Details';
                    
                    // Disable fields (they'll be re-enabled when Edit is clicked)
                    document.getElementById('fullName').readOnly = true;
                    document.getElementById('network').disabled = true;
                    document.getElementById('phoneNumber').readOnly = true;
                    
                    hideLoading();
                    showNotification('Withdrawal account saved successfully!');
                    
                } catch (error) {
                    hideLoading();
                    showNotification('Error saving account: ' + error.message, 'error');
                }
            };
        }

        // Function to edit withdrawal account
        function editWithdrawalAccount() {
            // Enable fields for editing
            document.getElementById('fullName').readOnly = false;
            document.getElementById('network').disabled = false;
            document.getElementById('phoneNumber').readOnly = false;
            
            // Change button back to Save
            document.getElementById('saveBtn').textContent = 'Save Details';
            hasWithdrawalAccount = false;
        }

        // Initialize when page loads
        window.onload = async () => {
            // Check auth state
            auth.onAuthStateChanged(async user => {
                if (user) {
                    // User is signed in
                    currentUser = user;
                    
                    showLoading('Loading withdrawal account...');
                    
                    try {
                        // Check if user already has a withdrawal account
                        const withdrawalAccountRef = database.ref(`users/${user.uid}/withdrawalAccount`);
                        withdrawalAccountRef.on('value', (snapshot) => {
                            const withdrawalData = snapshot.val();
                            
                            if (withdrawalData) {
                                // Populate fields
                                document.getElementById('fullName').value = withdrawalData.fullName || '';
                                document.getElementById('network').value = withdrawalData.network || '';
                                
                                // Format phone number for display (remove +267 and show 8 digits)
                                let displayPhone = withdrawalData.phoneNumber || '';
                                if (displayPhone.startsWith('+267')) {
                                    displayPhone = displayPhone.substring(4); // remove +267
                                }
                                document.getElementById('phoneNumber').value = displayPhone;
                                
                                // Set as readonly
                                document.getElementById('fullName').readOnly = true;
                                document.getElementById('network').disabled = true;
                                document.getElementById('phoneNumber').readOnly = true;
                                
                                // Update button
                                document.getElementById('saveBtn').textContent = 'Edit Details';
                                hasWithdrawalAccount = true;
                            }
                            
                            hideLoading();
                        }, (error) => {
                            hideLoading();
                            showNotification('Error loading account: ' + error.message, 'error');
                        });
                        
                    } catch (error) {
                        hideLoading();
                        showNotification('Error loading user data: ' + error.message, 'error');
                    }
                } else {
                    // No user is signed in
                    showNotification('Please log in to access this page', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            });
            
            // Handle save/edit button click
            document.getElementById('saveBtn').addEventListener('click', () => {
                if (hasWithdrawalAccount) {
                    editWithdrawalAccount();
                } else {
                    saveWithdrawalAccount();
                }
            });
            
            // Handle Enter key in password field
            document.getElementById('password').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('verifyPasswordBtn').click();
                }
            });
        };