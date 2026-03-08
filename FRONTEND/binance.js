// ========== FIREBASE CONFIG ==========
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
        const database = firebase.database();
        
        // ========== GLOBAL VARIABLES ==========
        let currentUser = null;
        let selectedChain = null; // 'tron' or 'bnb'
        let currentAmountNAD = 0;
        let currentAmountUSD = 0;
        let hasPending = false;
        
        // Hardcoded addresses (replace with your actual Binance addresses)
        const addresses = {
            tron: 'THizj1ibySKZyuqHzAHkrPsnsYictAYtbq',
            bnb: '0x1967fc302df6b5a29676a1836a16de31cb1c5676'
        };
        
        // Image URLs for chain badges and QR codes (local PNG files)
        const chainImages = {
            tron: 'https://cryptologos.cc/logos/tron-trx-logo.png',
            bnb: 'https://cryptologos.cc/logos/bnb-bnb-logo.png'
        };
        
        // QR code images – ensure these files exist in your project folder
        const qrImages = {
            tron: 'tron.png',
            bnb: 'bnb.png'
        };
        
        // Exchange rate (NAD to USD) - could be fetched from an API
        const NAD_TO_USD = 0.061; // 1 NAD = 0.06 USD
        
        // ========== DOM ELEMENTS ==========
        const tronBtn = document.getElementById('tronBtn');
        const bnbBtn = document.getElementById('bnbBtn');
        const depositCard = document.getElementById('depositCard');
        const chainBadge = document.getElementById('chainBadge');
        const chainIcon = document.getElementById('chainIcon');
        const chainName = document.getElementById('chainName');
        const addressDisplay = document.getElementById('addressDisplay');
        const qrImage = document.getElementById('qrImage');
        const amountInput = document.getElementById('amountInput');
        const conversionInfo = document.getElementById('conversionInfo');
        const copyAddressBtn = document.getElementById('copyAddressBtn');
        const copyAmountBtn = document.getElementById('copyAmountBtn');
        const sentBtn = document.getElementById('sentBtn');
        const pendingWarning = document.getElementById('pendingWarning');
        const historyBtn = document.getElementById('historyBtn');
        const historyModal = document.getElementById('historyModal');
        const historyList = document.getElementById('historyList');
        const closeHistoryBtn = document.getElementById('closeHistoryBtn');
        
        // Modal elements
        const screenshotModal = document.getElementById('screenshotModal');
        const cancelModalBtn = document.getElementById('cancelModalBtn');
        const submitModalBtn = document.getElementById('submitModalBtn');
        const txHashInput = document.getElementById('txHash');
        const screenshotFile = document.getElementById('screenshotFile');
        
        // ========== HELPER FUNCTIONS ==========
        function showLoading(show, text = 'Processing...') {
            document.getElementById('centerLoadingText').textContent = text;
            document.getElementById('centerLoading').classList.toggle('active', show);
            disablePage(show);
        }
        function disablePage(disable) {
            const overlay = document.getElementById('pageDisabled');
            overlay.classList.toggle('active', disable);
            document.querySelectorAll('button, input, select').forEach(el => { el.disabled = disable; });
        }
        
        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
        
        // Update USD conversion
        function updateConversion() {
            const nad = parseFloat(amountInput.value) || 0;
            currentAmountNAD = nad;
            currentAmountUSD = nad * NAD_TO_USD;
            conversionInfo.innerHTML = `≈ <strong>${currentAmountUSD.toFixed(2)} USD</strong>`;
        }
        
        // Copy address only
        function copyAddress() {
            if (!selectedChain) return;
            const address = addresses[selectedChain];
            navigator.clipboard.writeText(address).then(() => {
                showToast('Address copied!', 'success');
            }).catch(() => showToast('Failed to copy', 'error'));
        }
        
        // Copy USD amount only
        function copyAmount() {
            if (currentAmountNAD < 0.01) {
                showToast('No amount entered', 'error');
                return;
            }
            const text = `${currentAmountUSD.toFixed(2)} USD`;
            navigator.clipboard.writeText(text).then(() => {
                showToast('USD amount copied!', 'success');
            }).catch(() => showToast('Failed to copy', 'error'));
        }
        
        // Check for pending payments
        async function checkPendingPayments() {
            if (!currentUser) return false;
            try {
                const snapshot = await database.ref('crypto_payments')
                    .orderByChild('userId')
                    .equalTo(currentUser.uid)
                    .once('value');
                if (snapshot.exists()) {
                    const payments = snapshot.val();
                    for (let key in payments) {
                        if (payments[key].status === 'pending') {
                            return true;
                        }
                    }
                }
                return false;
            } catch (e) {
                console.error(e);
                return false;
            }
        }
        
        // Update UI based on pending status
        async function updatePendingUI() {
            hasPending = await checkPendingPayments();
            if (hasPending) {
                pendingWarning.style.display = 'block';
                tronBtn.disabled = true;
                bnbBtn.disabled = true;
                sentBtn.disabled = true;
                // If deposit card is open, maybe close it?
                depositCard.classList.remove('active');
            } else {
                pendingWarning.style.display = 'none';
                tronBtn.disabled = false;
                bnbBtn.disabled = false;
                // sentBtn will be enabled only after network selection and amount
            }
        }
        
        // Load deposit history and show modal
        async function showHistory() {
            if (!currentUser) {
                showToast('Please log in', 'error');
                return;
            }
            showLoading(true, 'Loading history...');
            try {
                const snapshot = await database.ref('crypto_payments')
                    .orderByChild('userId')
                    .equalTo(currentUser.uid)
                    .once('value');
                
                let html = '';
                if (snapshot.exists()) {
                    const payments = snapshot.val();
                    // Convert to array and sort by timestamp descending
                    const paymentsArray = Object.keys(payments).map(key => ({
                        id: key,
                        ...payments[key]
                    })).sort((a, b) => b.timestamp - a.timestamp);
                    
                    paymentsArray.forEach(p => {
                        const statusClass = p.status === 'pending' ? 'status-pending' : (p.status === 'approved' ? 'status-success' : 'status-failed');
                        const date = p.timestamp ? new Date(p.timestamp).toLocaleString() : 'N/A';
                        html += `
                            <div class="history-item ${p.status}">
                                <div class="history-row">
                                    <span class="history-label">Chain:</span>
                                    <span class="history-value">${p.chain?.toUpperCase() || 'N/A'}</span>
                                </div>
                                <div class="history-row">
                                    <span class="history-label">Amount:</span>
                                    <span class="history-value">${p.amountUSD ? p.amountUSD.toFixed(2) : '0'} USD</span>
                                </div>
                                <div class="history-row">
                                    <span class="history-label">Tx Hash:</span>
                                    <span class="history-value" style="font-size:12px;">${p.txHash ? p.txHash.substring(0,10)+'...' : 'N/A'}</span>
                                </div>
                                <div class="history-row">
                                    <span class="history-label">Date:</span>
                                    <span class="history-value">${date}</span>
                                </div>
                                <div class="history-row">
                                    <span class="history-label">Status:</span>
                                    <span class="history-status ${statusClass}">${p.status}</span>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    html = '<div class="empty-history">No deposits yet</div>';
                }
                historyList.innerHTML = html;
                showLoading(false);
                historyModal.classList.add('active');
            } catch (error) {
                showLoading(false);
                showToast('Error loading history: ' + error.message, 'error');
            }
        }
        
        // Show modal for screenshot upload
        function showScreenshotModal() {
            if (!selectedChain) {
                showToast('Please select a network first', 'error');
                return;
            }
            if (currentAmountNAD < 1) {
                showToast('Please enter a valid amount', 'error');
                return;
            }
            if (hasPending) {
                showToast('You have a pending deposit', 'error');
                return;
            }
            screenshotModal.classList.add('active');
        }
        
        // Hide modal
        function hideModal() {
            screenshotModal.classList.remove('active');
            txHashInput.value = '';
            screenshotFile.value = '';
        }
        
        // Submit verification (save to Firebase Realtime Database with base64 image)
        async function submitVerification() {
            const txHash = txHashInput.value.trim();
            const file = screenshotFile.files[0];
            
            if (!txHash) {
                showToast('Please enter transaction hash', 'error');
                return;
            }
            if (!file) {
                showToast('Please upload a screenshot', 'error');
                return;
            }
            if (!currentUser) {
                showToast('You must be logged in', 'error');
                return;
            }
            if (hasPending) {
                showToast('You have a pending deposit', 'error');
                hideModal();
                return;
            }
            
            showLoading(true, 'Submitting...');
            
            try {
                // Convert screenshot to base64
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async function() {
                    const screenshotBase64 = reader.result; // base64 string
                    
                    const paymentData = {
                        userId: currentUser.uid,
                        userEmail: currentUser.email,
                        chain: selectedChain,
                        address: addresses[selectedChain],
                        amountNAD: currentAmountNAD,
                        amountUSD: currentAmountUSD,
                        txHash: txHash,
                        screenshot: screenshotBase64, // stored directly in DB
                        status: 'pending',
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    };
                    
                    await database.ref('crypto_payments').push(paymentData);
                    
                    showLoading(false);
                    hideModal();
                    showToast('Deposit submitted! Await confirmation.', 'success');
                    
                    // Refresh pending status
                    await updatePendingUI();
                };
                reader.onerror = function() {
                    showLoading(false);
                    showToast('Error reading file', 'error');
                };
            } catch (error) {
                showLoading(false);
                showToast('Error: ' + error.message, 'error');
            }
        }
        
        // ========== EVENT LISTENERS ==========
        tronBtn.addEventListener('click', () => {
            if (hasPending) return;
            selectedChain = 'tron';
            tronBtn.classList.add('active');
            bnbBtn.classList.remove('active');
            
            // Update UI
            chainIcon.src = chainImages.tron;
            chainName.textContent = 'TRON';
            chainBadge.className = 'chain-badge tron';
            addressDisplay.textContent = addresses.tron;
            // Set QR code image to tron.png
            qrImage.src = qrImages.tron;
            
            depositCard.classList.add('active');
            // Enable sent button only if amount > 0
            sentBtn.disabled = !(currentAmountNAD > 0);
        });
        
        bnbBtn.addEventListener('click', () => {
            if (hasPending) return;
            selectedChain = 'bnb';
            bnbBtn.classList.add('active');
            tronBtn.classList.remove('active');
            
            chainIcon.src = chainImages.bnb;
            chainName.textContent = 'BNB';
            chainBadge.className = 'chain-badge bnb';
            addressDisplay.textContent = addresses.bnb;
            // Set QR code image to bnb.png
            qrImage.src = qrImages.bnb;
            
            depositCard.classList.add('active');
            sentBtn.disabled = !(currentAmountNAD > 0);
        });
        
        amountInput.addEventListener('input', function() {
            updateConversion();
            // Enable sent button if amount > 0 and network selected and no pending
            if (selectedChain && currentAmountNAD > 0 && !hasPending) {
                sentBtn.disabled = false;
            } else {
                sentBtn.disabled = true;
            }
        });
        
        copyAddressBtn.addEventListener('click', copyAddress);
        copyAmountBtn.addEventListener('click', copyAmount);
        
        sentBtn.addEventListener('click', showScreenshotModal);
        
        cancelModalBtn.addEventListener('click', hideModal);
        submitModalBtn.addEventListener('click', submitVerification);
        
        historyBtn.addEventListener('click', showHistory);
        closeHistoryBtn.addEventListener('click', () => {
            historyModal.classList.remove('active');
        });
        
        // Close modals if clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === screenshotModal) hideModal();
            if (e.target === historyModal) historyModal.classList.remove('active');
        });
        
        // ========== AUTH STATE ==========
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                await updatePendingUI();
            } else {
                showToast('Please log in', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
            }
        });