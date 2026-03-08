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
        
        // Investment Data in ZMW with Images
        const investmentLevels = [
            {
                id: 'level1',
                name: 'Level 1',
                price: 150,
                dailyReturn: 12,
                monthlyReturn: 360,
                yearlyReturn: 4320,
                description: 'Perfect start for beginners. Low risk, steady returns.',
                imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level2',
                name: 'Level 2',
                price: 300,
                dailyReturn: 25,
                monthlyReturn: 750,
                yearlyReturn: 9000,
                description: 'Enhanced features with better returns. Ideal for growing portfolio.',
                imageUrl: 'https://images.unsplash.com/photo-1591696205602-2f950c417cb9?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level3',
                name: 'Level 3',
                price: 450,
                dailyReturn: 37,
                monthlyReturn: 1110,
                yearlyReturn: 13320,
                description: 'Premium features for serious investors seeking higher profits.',
                imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level4',
                name: 'Level 4',
                price: 600,
                dailyReturn: 50,
                monthlyReturn: 1500,
                yearlyReturn: 18000,
                description: 'Advanced investment opportunities with excellent returns.',
                imageUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level5',
                name: 'Level 5',
                price: 1000,
                dailyReturn: 100,
                monthlyReturn: 3000,
                yearlyReturn: 36000,
                description: 'Professional level with exclusive benefits and support.',
                imageUrl: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level6',
                name: 'Level 6',
                price: 1500,
                dailyReturn: 150,
                monthlyReturn: 4500,
                yearlyReturn: 54000,
                description: 'VIP access to premium investment options and strategies.',
                imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level7',
                name: 'Level 7',
                price: 2000,
                dailyReturn: 250,
                monthlyReturn: 7500,
                yearlyReturn: 90000,
                description: 'Exclusive high-tier investment portfolio management.',
                imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level8',
                name: 'Level 8',
                price: 5000,
                dailyReturn: 625,
                monthlyReturn: 18750,
                yearlyReturn: 225000,
                description: 'Elite investor level with maximum benefits and personal advisor.',
                imageUrl: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level9',
                name: 'Level 9',
                price: 10000,
                dailyReturn: 2000,
                monthlyReturn: 60000,
                yearlyReturn: 720000,
                description: 'Premium investor status with special privileges and insights.',
                imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'level10',
                name: 'Level 10',
                price: 20000,
                dailyReturn: 4000,
                monthlyReturn: 120000,
                yearlyReturn: 1440000,
                description: 'Highest investment tier with exclusive opportunities and priority access.',
                imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
            }
        ];
        
        // Current user data
        let currentUser = null;
        let userBalance = 0;
        let userLevels = [];
        
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
            
            setTimeout(() => {
                notification.remove();
            }, 3500);
        }
        
        // Function to show success popup
        function showSuccessPopup(levelData) {
            // Set content
            document.getElementById('successPopupTitle').textContent = 'Investment Successful!';
            document.getElementById('successPopupSubtitle').textContent = `You've successfully invested in ${levelData.name}`;
            document.getElementById('successDetailLevel').textContent = levelData.name;
            document.getElementById('successDetailAmount').textContent = formatAmount(levelData.price);
            document.getElementById('successDetailDaily').textContent = formatAmount(levelData.dailyReturn);
            document.getElementById('successDetailMonthly').textContent = formatAmount(levelData.monthlyReturn);
            document.getElementById('successDetailYearly').textContent = formatAmount(levelData.yearlyReturn);
            
            // Show overlay
            document.getElementById('successPopupOverlay').style.display = 'flex';
            
            // Setup OK button
            document.getElementById('successPopupOkBtn').onclick = function() {
                document.getElementById('successPopupOverlay').style.display = 'none';
            };
        }
        
        // Function to show error popup
        function showErrorPopup(title, message) {
            document.getElementById('errorPopupTitle').textContent = title;
            document.getElementById('errorPopupMessage').textContent = message;
            document.getElementById('errorPopupOverlay').style.display = 'flex';
            
            document.getElementById('errorPopupOkBtn').onclick = function() {
                document.getElementById('errorPopupOverlay').style.display = 'none';
            };
        }
        
        // Function to show confirmation popup
        function showConfirmationPopup(levelData) {
            const popupHtml = `
                <strong>${levelData.name}</strong><br><br>
                Investment Amount: <strong>${formatAmount(levelData.price)}</strong><br><br>
                <div class="popup-details">
                    <div class="popup-detail-row">
                        <span>Daily Return:</span>
                        <span class="popup-detail-value">${formatAmount(levelData.dailyReturn)}</span>
                    </div>
                    <div class="popup-detail-row">
                        <span>Monthly Return:</span>
                        <span class="popup-detail-value">${formatAmount(levelData.monthlyReturn)}</span>
                    </div>
                    <div class="popup-detail-row">
                        <span>Yearly Return:</span>
                        <span class="popup-detail-value">${formatAmount(levelData.yearlyReturn)}</span>
                    </div>
                </div>
                Are you sure you want to proceed with this investment?
            `;
            
            document.getElementById('popupTitle').textContent = 'Confirm Investment';
            document.getElementById('popupMessageContainer').innerHTML = popupHtml;
            
            return new Promise((resolve) => {
                const overlay = document.getElementById('popupOverlay');
                overlay.style.display = 'flex';
                
                document.getElementById('popupConfirm').onclick = function() {
                    overlay.style.display = 'none';
                    resolve(true);
                };
                
                document.getElementById('popupCancel').onclick = function() {
                    overlay.style.display = 'none';
                    resolve(false);
                };
            });
        }
        
        // Function to show loading
        function showLoading(message) {
            document.getElementById('loadingText').textContent = message;
            document.getElementById('loadingOverlay').style.display = 'flex';
        }
        
        // Function to hide loading
        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
        
        // Function to show button spinner
        function showButtonSpinner(levelId) {
            const spinner = document.getElementById(`spinner-${levelId}`);
            const button = document.getElementById(`${levelId}-btn`);
            const buttonText = button.querySelector('.button-text');
            
            if (spinner) spinner.style.display = 'inline-block';
            if (buttonText) buttonText.textContent = 'Processing...';
        }
        
        // Function to hide button spinner
        function hideButtonSpinner(levelId) {
            const spinner = document.getElementById(`spinner-${levelId}`);
            const button = document.getElementById(`${levelId}-btn`);
            const buttonText = button.querySelector('.button-text');
            
            if (spinner) spinner.style.display = 'none';
            if (buttonText) buttonText.textContent = 'Already Invested ✓';
        }
        
        // Function to format amount
        function formatAmount(amount) {
            return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' BWP';
        }
        
        // Function to create investment cards
        function createInvestmentCards() {
            const container = document.getElementById('investmentLevelsContainer');
            container.innerHTML = '';
            
            investmentLevels.forEach((level, index) => {
                const isInvested = userLevels.includes(level.id);
                const buttonText = isInvested ? 'Already Invested ✅' : 'Invest Now';
                
                const levelCard = document.createElement('div');
                levelCard.className = 'level-card';
                levelCard.style.setProperty('--card-index', index);
                
                levelCard.innerHTML = `
                    <div class="level-badge">${level.name}</div>
                    <div class="level-image-container">
                        <img src="${level.imageUrl}" alt="${level.name} Investment" class="level-image">
                        <div class="level-image-overlay"></div>
                    </div>
                    <div class="level-header">
                        <div class="level-title">Investment Package</div>
                        <div class="level-price">${formatAmount(level.price)}</div>
                    </div>
                    <div class="level-description">
                        ${level.description}
                    </div>
                    <div class="level-details">
                        <div class="detail-row">
                            <span class="detail-label">Daily Return:</span>
                            <span class="detail-value">${formatAmount(level.dailyReturn)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Monthly Return:</span>
                            <span class="detail-value">${formatAmount(level.monthlyReturn)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Yearly Return:</span>
                            <span class="detail-value">${formatAmount(level.yearlyReturn)}</span>
                        </div>
                    </div>
                    <button class="invest-btn" id="${level.id}-btn" ${isInvested ? 'disabled' : ''}>
                        <span class="button-spinner" id="spinner-${level.id}"></span>
                        <span class="button-text">${buttonText}</span>
                    </button>
                `;
                
                container.appendChild(levelCard);
                
                if (!isInvested) {
                    const button = document.getElementById(`${level.id}-btn`);
                    button.onclick = () => handleInvestment(level);
                }
            });
        }
        
        // Main investment handler
        async function handleInvestment(levelData) {
            if (!currentUser) {
                showNotification('You must be logged in to invest', 'error');
                return;
            }
            
            if (userLevels.includes(levelData.id)) {
                showNotification('You already have access to this level', 'warning');
                return;
            }
            
            if (userBalance < levelData.price) {
                const needed = levelData.price - userBalance;
                showErrorPopup(
                    'Insufficient Balance', 
                    `You need ${formatAmount(needed)} more to invest in ${levelData.name}.\n\nYour balance: ${formatAmount(userBalance)}\nRequired: ${formatAmount(levelData.price)}\n\nPlease deposit more funds to continue.`
                );
                return;
            }
            
            // Show confirmation popup
            const confirmed = await showConfirmationPopup(levelData);
            if (!confirmed) return;
            
            // Show loading
            showLoading('Processing your investment...');
            showButtonSpinner(levelData.id);
            
            try {
                // Update balance in Firebase
                const newBalance = userBalance - levelData.price;
                
                // Create updates object
                const updates = {};
                updates[`users/${currentUser.uid}/balance`] = newBalance;
                updates[`users/${currentUser.uid}/levels/${levelData.id}`] = {
                    investedAt: firebase.database.ServerValue.TIMESTAMP,
                    amount: levelData.price,
                    dailyReturn: levelData.dailyReturn,
                    monthlyReturn: levelData.monthlyReturn,
                    yearlyReturn: levelData.yearlyReturn
                };
                
                // Add transaction
                const transactionId = database.ref('transactions').push().key;
                updates[`transactions/${transactionId}`] = {
                    userId: currentUser.uid,
                    type: 'investment',
                    level: levelData.id,
                    levelName: levelData.name,
                    amount: levelData.price,
                    dailyReturn: levelData.dailyReturn,
                    monthlyReturn: levelData.monthlyReturn,
                    yearlyReturn: levelData.yearlyReturn,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    status: 'completed'
                };
                
                // Update all data at once
                await database.ref().update(updates);
                
                // Update local state
                userBalance = newBalance;
                userLevels.push(levelData.id);
                
                // Update UI
                document.getElementById('userBalance').textContent = formatAmount(userBalance);
                
                // Disable button and update text
                const button = document.getElementById(`${levelData.id}-btn`);
                button.disabled = true;
                hideButtonSpinner(levelData.id);
                
                // Hide loading
                hideLoading();
                
                // Show success popup
                showSuccessPopup(levelData);
                
            } catch (error) {
                console.error('Investment error:', error);
                hideLoading();
                
                // Hide button spinner
                const spinner = document.getElementById(`spinner-${levelData.id}`);
                const button = document.getElementById(`${levelData.id}-btn`);
                const buttonText = button.querySelector('.button-text');
                
                if (spinner) spinner.style.display = 'none';
                if (buttonText) buttonText.textContent = 'Invest Now';
                
                // Show error popup
                showErrorPopup(
                    'Investment Failed',
                    `An error occurred while processing your investment. Please try again.\n\nError: ${error.message}`
                );
            }
        }
        
        // Initialize page
        window.onload = async () => {
            // Wait for authentication
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    currentUser = user;
                    document.getElementById('userEmail').textContent = user.email;
                    
                    showLoading('Loading your investment data...');
                    
                    try {
                        // Get user data from Firebase
                        const userRef = database.ref(`users/${user.uid}`);
                        const snapshot = await userRef.once('value');
                        const userData = snapshot.val();
                        
                        if (userData) {
                            userBalance = userData.balance || 0;
                            document.getElementById('userBalance').textContent = formatAmount(userBalance);
                            
                            // Get user levels
                            userLevels = [];
                            if (userData.levels) {
                                userLevels = Object.keys(userData.levels);
                            }
                            
                            // Create cards
                            createInvestmentCards();
                        }
                        
                        hideLoading();
                        
                    } catch (error) {
                        hideLoading();
                        showErrorPopup('Data Loading Error', 'Failed to load your account data. Please refresh the page.');
                    }
                } else {
                    // No user logged in
                    showNotification('Please login to access this page', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            });
        };