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
        
        // User data
        let currentUser = null;
        let giftPoints = 0;
        let balance = 0;
        let hasInvestments = false;
        
        // Back button event
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'gifts.html';
        });
        
        // Invest now button event
        document.getElementById('investNowBtn').addEventListener('click', () => {
            window.location.href = 'recharge.html';
        });
        
        // Update conversion result
        function updateConversionResult() {
            const points = parseInt(document.getElementById('pointsInput').value) || 0;
            const zmw = points / 50;
            document.getElementById('conversionResult').textContent = zmw.toFixed(2) + ' MZN';
            
            // Enable/disable convert button based on points, investments, and validation
            const convertBtn = document.getElementById('convertBtn');
            if (points >= 50 && points <= giftPoints && hasInvestments) {
                convertBtn.disabled = false;
            } else {
                convertBtn.disabled = true;
                
                // Update button text based on reason
                if (!hasInvestments) {
                    document.getElementById('convertBtnText').textContent = 'Requires Investment';
                } else if (points < 50) {
                    document.getElementById('convertBtnText').textContent = 'Minimum 50 Points';
                } else if (points > giftPoints) {
                    document.getElementById('convertBtnText').textContent = 'Insufficient Points';
                } else {
                    document.getElementById('convertBtnText').textContent = 'Convert Now';
                }
            }
        }
        
        // Show notification
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            const text = document.getElementById('notificationText');
            const icon = notification.querySelector('i');
            
            text.textContent = message;
            
            if (type === 'success') {
                notification.style.background = 'rgba(0, 255, 136, 0.9)';
                notification.style.color = '#000';
                icon.className = 'fas fa-check-circle';
                notification.className = 'notification';
            } else if (type === 'error') {
                notification.style.background = 'rgba(255, 0, 85, 0.9)';
                notification.style.color = '#fff';
                icon.className = 'fas fa-exclamation-circle';
                notification.className = 'notification error';
            }
            
            notification.style.display = 'flex';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
        
        // Check if user has investments
        function checkUserInvestments(userId) {
            return new Promise((resolve, reject) => {
                database.ref(`users/${userId}/levels`).once('value')
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            const levels = snapshot.val();
                            hasInvestments = Object.keys(levels).length > 0;
                            resolve(hasInvestments);
                        } else {
                            hasInvestments = false;
                            resolve(false);
                        }
                    })
                    .catch((error) => {
                        console.error('Error checking investments:', error);
                        hasInvestments = false;
                        resolve(false);
                    });
            });
        }
        
        // Convert points
        function convertPoints() {
            // Double-check investments before proceeding
            if (!hasInvestments) {
                showNotification('You must have at least one active investment to convert points', 'error');
                return;
            }
            
            const pointsToConvert = parseInt(document.getElementById('pointsInput').value);
            
            if (pointsToConvert < 50) {
                showNotification('Minimum conversion is 50 points', 'error');
                return;
            }
            
            if (pointsToConvert > giftPoints) {
                showNotification('Not enough gift points', 'error');
                return;
            }
            
            // Show loading
            document.getElementById('loading').style.display = 'flex';
            document.getElementById('convertBtn').disabled = true;
            
            const zmwAmount = pointsToConvert / 50;
            
            // Update database
            const updates = {};
            const newGiftPoints = giftPoints - pointsToConvert;
            const newBalance = balance + zmwAmount;
            
            updates[`users/${currentUser.uid}/giftPoints`] = newGiftPoints;
            updates[`users/${currentUser.uid}/balance`] = newBalance;
            
            // Record conversion transaction
            const conversionData = {
                userId: currentUser.uid,
                type: 'gift_conversion',
                pointsConverted: pointsToConvert,
                zmwReceived: zmwAmount,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                date: new Date().toDateString(),
                hasInvestments: hasInvestments
            };
            
            const conversionRef = database.ref('conversions').push();
            updates[`conversions/${conversionRef.key}`] = conversionData;
            
            database.ref().update(updates)
                .then(() => {
                    // Update local data
                    giftPoints = newGiftPoints;
                    balance = newBalance;
                    
                    // Update UI
                    document.getElementById('availablePoints').textContent = newGiftPoints;
                    document.getElementById('pointsInput').value = '';
                    updateConversionResult();
                    
                    // Hide loading
                    document.getElementById('loading').style.display = 'none';
                    
                    // Show success message
                    showNotification(`Successfully converted ${pointsToConvert} points to ${zmwAmount.toFixed(2)} ZMW!`);
                })
                .catch(error => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('convertBtn').disabled = false;
                    showNotification('Conversion failed: ' + error.message, 'error');
                });
        }
        
        // Initialize page
        window.onload = () => {
            // Check auth
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    currentUser = user;
                    
                    // Load user data
                    database.ref(`users/${user.uid}`).on('value', async (snapshot) => {
                        const data = snapshot.val();
                        if (data) {
                            giftPoints = data.giftPoints || 0;
                            balance = data.balance || 0;
                            
                            document.getElementById('availablePoints').textContent = giftPoints;
                            
                            // Set max value for input
                            document.getElementById('pointsInput').max = giftPoints;
                            
                            // Check if user has investments
                            await checkUserInvestments(user.uid);
                            
                            // Show/hide warning and form based on investments
                            const warningBox = document.getElementById('noInvestmentWarning');
                            const conversionForm = document.getElementById('conversionForm');
                            
                            if (hasInvestments) {
                                warningBox.style.display = 'none';
                                conversionForm.style.display = 'block';
                            } else {
                                warningBox.style.display = 'block';
                                conversionForm.style.display = 'none';
                                document.getElementById('convertBtn').disabled = true;
                                document.getElementById('convertBtnText').textContent = 'Requires Investment';
                                document.getElementById('pointsInput').disabled = true;
                            }
                            
                            // Update conversion result
                            updateConversionResult();
                        }
                    });
                } else {
                    window.location.href = 'login.html';
                }
            });
            
            // Input event
            document.getElementById('pointsInput').addEventListener('input', updateConversionResult);
            
            // Convert button event
            document.getElementById('convertBtn').addEventListener('click', convertPoints);
        };