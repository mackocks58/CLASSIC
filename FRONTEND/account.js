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
        
        // DOM Elements
        const loadingOverlay = document.getElementById('loadingOverlay');
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        const qrCodeCanvas = document.getElementById('qrCodeCanvas');
        const downloadQRBtn = document.getElementById('downloadQRBtn');
        const shareQRBtn = document.getElementById('shareQRBtn');
        
        // Global variable for referral link
        let userReferralLink = '';
        let qrCodeGenerated = false;
        
        // Function to show loading
        function showLoading() {
            loadingOverlay.style.display = 'flex';
        }
        
        // Function to hide loading
        function hideLoading() {
            loadingOverlay.style.display = 'none';
        }
        
        // Function to show notification
        function showNotification(message, type = 'success') {
            notificationText.textContent = message;
            notification.style.background = type === 'success' ? '#00ff88' : 
                                           type === 'error' ? '#ff0055' : 
                                           type === 'warning' ? '#ffaa00' : '#0099ff';
            notification.style.color = type === 'success' || type === 'warning' ? '#000' : '#fff';
            
            const icon = notification.querySelector('i');
            icon.className = type === 'success' ? 'fas fa-check-circle' :
                            type === 'error' ? 'fas fa-exclamation-circle' :
                            type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
            
            notification.style.display = 'flex';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
        
        // Function to format amount
        function formatAmount(amount) {
            return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' BWP';
        }
        
        // Function to format date
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Function to get initials from name
        function getInitials(name) {
            if (!name) return 'U';
            return name.split(' ')
                .map(part => part[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
        }
        
        // Function to copy text to clipboard
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy:', err);
                showNotification('Failed to copy', 'error');
            });
        }
        
        // Function to generate QR code using qrcode-generator library
        function generateQRCode(text) {
            try {
                // Check if qrcode library is available
                if (typeof qrcode !== 'undefined') {
                    // Create QR code instance
                    const typeNumber = 0; // Auto
                    const errorCorrectionLevel = 'H'; // High error correction
                    
                    // Create QR code
                    const qr = qrcode(typeNumber, errorCorrectionLevel);
                    qr.addData(text);
                    qr.make();
                    
                    // Get canvas context
                    const ctx = qrCodeCanvas.getContext('2d');
                    
                    // Set canvas size
                    qrCodeCanvas.width = 200;
                    qrCodeCanvas.height = 200;
                    
                    // Clear canvas
                    ctx.clearRect(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
                    
                    // Set background to white
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
                    
                    // Get QR code modules
                    const moduleCount = qr.getModuleCount();
                    const cellSize = Math.min(qrCodeCanvas.width, qrCodeCanvas.height) / moduleCount;
                    
                    // Draw QR code
                    ctx.fillStyle = '#000000';
                    
                    for (let row = 0; row < moduleCount; row++) {
                        for (let col = 0; col < moduleCount; col++) {
                            if (qr.isDark(row, col)) {
                                ctx.fillRect(
                                    col * cellSize,
                                    row * cellSize,
                                    cellSize,
                                    cellSize
                                );
                            }
                        }
                    }
                    
                    qrCodeGenerated = true;
                    console.log('QR Code generated successfully');
                } else {
                    console.warn('QR code library not loaded, using fallback');
                    generateQRCodeFallback(text);
                }
            } catch (error) {
                console.error('QR Code generation error:', error);
                showNotification('Failed to generate QR code', 'error');
                generateQRCodeFallback(text);
            }
        }
        
        // Fallback QR code generation using simple method
        function generateQRCodeFallback(text) {
            try {
                const ctx = qrCodeCanvas.getContext('2d');
                qrCodeCanvas.width = 200;
                qrCodeCanvas.height = 200;
                
                // Clear canvas
                ctx.clearRect(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
                
                // Set background to white
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
                
                // Draw simple pattern as fallback
                ctx.fillStyle = '#000000';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('CLASSIC MAXIMIZE', qrCodeCanvas.width / 2, qrCodeCanvas.height / 2 - 20);
                ctx.fillText('Referral Code', qrCodeCanvas.width / 2, qrCodeCanvas.height / 2);
                ctx.font = '12px Arial';
                ctx.fillText('Scan with camera', qrCodeCanvas.width / 2, qrCodeCanvas.height / 2 + 20);
                
                // Draw border
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2;
                ctx.strokeRect(5, 5, qrCodeCanvas.width - 10, qrCodeCanvas.height - 10);
                
                showNotification('QR code generated (basic mode)', 'info');
            } catch (error) {
                console.error('Fallback QR Code error:', error);
            }
        }
        
        // Function to download QR code as image
        function downloadQRCode() {
            try {
                if (!qrCodeGenerated) {
                    showNotification('Please wait for QR code to generate', 'warning');
                    return;
                }
                
                const link = document.createElement('a');
                const fileName = `CLASSIC-Referral-${Date.now()}.png`;
                link.download = fileName;
                link.href = qrCodeCanvas.toDataURL('image/png');
                link.click();
                showNotification('QR Code downloaded successfully!', 'success');
            } catch (error) {
                console.error('Download error:', error);
                showNotification('Failed to download QR code', 'error');
            }
        }
        
        // Function to share QR code
        function shareQRCode() {
            if (navigator.share && qrCodeGenerated) {
                // Convert canvas to blob
                qrCodeCanvas.toBlob(blob => {
                    const file = new File([blob], `CLASSIC-Referral-QR.png`, { type: 'image/png' });
                    
                    navigator.share({
                        title: 'Join CLASSIC MAXIMIZE Investment',
                        text: `Join me on CLASSIC MAXIMIZE Investment! Use my referral link: ${userReferralLink}`,
                        files: [file],
                        url: userReferralLink
                    }).then(() => {
                        showNotification('QR Code shared successfully!', 'success');
                    }).catch(error => {
                        console.error('Share error:', error);
                        // Fallback to copying link
                        copyToClipboard(userReferralLink);
                    });
                });
            } else {
                // Fallback: copy link to clipboard
                copyToClipboard(userReferralLink);
            }
        }
        
        // Function to load user profile
        async function loadUserProfile() {
            showLoading();
            
            try {
                const user = auth.currentUser;
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                
                // Get user data from database
                const snapshot = await database.ref(`users/${user.uid}`).once('value');
                const userData = snapshot.val();
                
                if (!userData) {
                    showNotification('User data not found', 'error');
                    hideLoading();
                    return;
                }
                
                // Generate email from phone (same as in signup)
                const email = `${userData.phone.replace(/\D/g, '')}@NewHope.com`;
                
                // Generate display name (use phone if name not available)
                const displayName = userData.fullName || userData.phone || 'User';
                
                // Update profile header
                document.getElementById('profileAvatar').textContent = getInitials(displayName);
                document.getElementById('profileName').textContent = displayName;
                document.getElementById('profilePhone').textContent = userData.phone || 'N/A';
                
                // Update stats
                document.getElementById('balanceAmount').textContent = formatAmount(userData.balance || 0);
                document.getElementById('profitAmount').textContent = formatAmount(userData.profit || 0);
                document.getElementById('depositedAmount').textContent = formatAmount(userData.deposited || 0);
                document.getElementById('earningsAmount').textContent = formatAmount(userData.totalEarnings || 0);
                
                // Update account details
                document.getElementById('detailName').textContent = displayName;
                document.getElementById('detailPhone').textContent = userData.phone || 'N/A';
                document.getElementById('detailEmail').textContent = email;
                document.getElementById('detailUserId').textContent = user.uid.substring(0, 8) + '...';
                document.getElementById('detailJoinDate').textContent = formatDate(userData.signupDate || new Date().toISOString());
                
                // Update referral section
                document.getElementById('referralCode').textContent = userData.referralCode || 'N/A';
                document.getElementById('referralCodeDisplay').textContent = userData.referralCode || 'N/A';
                
                // Generate referral link
                const baseUrl = window.location.origin;
                userReferralLink = `${baseUrl}?ref=${userData.referralCode}`;
                document.getElementById('referralLink').textContent = userReferralLink;
                
                // Add data attributes for copying
                document.getElementById('detailName').setAttribute('data-text', displayName);
                document.getElementById('detailPhone').setAttribute('data-text', userData.phone || '');
                document.getElementById('detailEmail').setAttribute('data-text', email);
                document.getElementById('detailUserId').setAttribute('data-text', user.uid);
                document.getElementById('referralCode').setAttribute('data-text', userData.referralCode || '');
                document.getElementById('referralLink').setAttribute('data-text', userReferralLink);
                
                // Generate QR code for referral link
                setTimeout(() => {
                    generateQRCode(userReferralLink);
                }, 500);
                
                hideLoading();
                
            } catch (error) {
                hideLoading();
                console.error('Error loading profile:', error);
                showNotification('Error loading profile data', 'error');
            }
        }
        
        // Function to handle logout
        async function handleLogout() {
            showLoading();
            
            try {
                await auth.signOut();
                showNotification('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } catch (error) {
                hideLoading();
                showNotification('Logout failed: ' + error.message, 'error');
            }
        }
        
        // Function to handle copy button clicks
        function setupCopyButtons() {
            document.querySelectorAll('.copy-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const targetId = this.getAttribute('data-copy');
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        const textToCopy = targetElement.getAttribute('data-text') || targetElement.textContent;
                        
                        // Add visual feedback
                        const originalText = this.innerHTML;
                        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        this.classList.add('copied');
                        
                        copyToClipboard(textToCopy.trim());
                        
                        // Reset button after 2 seconds
                        setTimeout(() => {
                            this.innerHTML = originalText;
                            this.classList.remove('copied');
                        }, 2000);
                    }
                });
            });
        }
        
        // Function to set up QR code actions
        function setupQRActions() {
            if (downloadQRBtn) {
                downloadQRBtn.addEventListener('click', downloadQRCode);
            }
            
            if (shareQRBtn) {
                shareQRBtn.addEventListener('click', shareQRCode);
            }
        }
        
        // Function to navigate to other pages
        function setupNavigation() {
            document.getElementById('backBtn').addEventListener('click', function() {
                window.location.href = 'dashboard.html';
            });
            
            document.getElementById('editProfileBtn').addEventListener('click', function() {
                window.location.href='bind.html';
            });
            
            document.getElementById('changePasswordBtn').addEventListener('click', function() {
                showNotification('Change password feature coming soon!', 'info');
            });
            
            document.getElementById('withdrawBtn').addEventListener('click', function() {
                window.location.href = 'withdrawal.html';
            });
            
            document.getElementById('depositBtn').addEventListener('click', function() {
                window.location.href = 'deposit.html';
            });
        }
        
        // Initialize page
        window.onload = () => {
            // Set up logout button
            document.getElementById('logoutBtn').addEventListener('click', handleLogout);
            
            // Set up copy buttons
            setupCopyButtons();
            
            // Set up QR code actions
            setupQRActions();
            
            // Set up navigation
            setupNavigation();
            
            // Check authentication state
            auth.onAuthStateChanged(user => {
                if (user) {
                    loadUserProfile();
                } else {
                    window.location.href = 'login.html';
                }
            });
        };