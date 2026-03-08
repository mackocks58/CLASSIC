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
        let hasPendingRequest = false;
        let currentAmount = 0;
        let currentPhone = '';
        let detectedNetworkKey = '';
        let currentPaymentNumber = '';
        let currentAccountName = '';
        let currentReference = 'DEPOSIT_';
        
        // Data loaded from Firebase
        let paymentMethods = {};
        let networkKeys = [];
        
        // ========== DOM ELEMENTS ==========
        // (declared later inside onload)
        
        // ========== HELPER FUNCTIONS ==========
        function showCenterLoading(show, text = 'Processing...') {
            document.getElementById('centerLoadingText').textContent = text;
            document.getElementById('centerLoading').classList.toggle('active', show);
            disablePage(show);
        }
        function disablePage(disable) {
            const overlay = document.getElementById('pageDisabled');
            overlay.classList.toggle('active', disable);
            document.querySelectorAll('button, input, select').forEach(el => { el.disabled = disable; });
        }
        
        function showErrorBar(title, message) {
            document.getElementById('errorTitle').textContent = title;
            document.getElementById('errorMessage').textContent = message;
            document.getElementById('errorBar').classList.add('active');
        }
        function showSuccessBar(message) {
            document.getElementById('successMessage').textContent = message;
            document.getElementById('successBar').classList.add('active');
        }
        
        // Botswana phone validation: 8 digits, first digit 7
        function isValidBotswanaPhone(digits) {
            return /^7\d{7}$/.test(digits);
        }
        
        // Amount validation (BWP)
        function validateAmount(amount) {
            if (amount < 150) return { valid: false, message: 'Minimum 150 BWP' };
            if (amount > 1000000) return { valid: false, message: 'Maximum 1,000,000 BWP' };
            return { valid: true, message: '✓ Amount accepted' };
        }
        
        function formatAmount(amount) {
            return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        
        function copyToClipboard(text, label) {
            navigator.clipboard.writeText(text).then(() => {
                const toast = document.createElement('div');
                toast.textContent = `${label} copied!`;
                toast.style.cssText = `
                    position: fixed; top: 20px; right: 20px;
                    background: linear-gradient(135deg, var(--golden), var(--dark-golden));
                    color: var(--dark-black); padding: 14px 22px; border-radius: 10px;
                    font-size: 15px; font-weight: 700; z-index: 9999;
                    box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
                    animation: fadeInOut 3s ease-in-out;
                `;
                document.body.appendChild(toast);
                setTimeout(() => { document.body.removeChild(toast); }, 3000);
            }).catch(() => showErrorBar('Error', 'Unable to copy.'));
        }
        
        // ========== LOAD PAYMENT METHODS FROM FIREBASE ==========
        async function loadPaymentMethods() {
            try {
                showCenterLoading(true, 'Loading payment methods...');
                const snapshot = await database.ref('paymentMethods').once('value');
                if (snapshot.exists()) {
                    paymentMethods = snapshot.val();
                } else {
                    // Default Botswana operators if not in DB
                    paymentMethods = {
                        "Mascom MyZaka": {
                            number: "76638462",
                            accountName: "Tumisang mokgethi",
                            prefixes: ["71", "72", "73"],
                            icon: "fas fa-mobile-alt",
                            color: "#00A859"
                        },
                        "Orange Money": {
                            number: "75255007",
                            accountName: "Tumisang mokgethi",
                            prefixes: ["74", "75", "76"],
                            icon: "fas fa-sim-card",
                            color: "#FF6600"
                        },
                        "BeMobile Money": {
                            number: "75255007",
                            accountName: "Tumisang mokgethi",
                            prefixes: ["77", "78", "79"],
                            icon: "fas fa-phone-alt",
                            color: "#0047AB"
                        }
                    };
                }
                networkKeys = Object.keys(paymentMethods);
                showCenterLoading(false);
                return paymentMethods;
            } catch (error) {
                console.error("Error loading paymentMethods:", error);
                showCenterLoading(false);
                showErrorBar('Error', 'Could not load payment methods.');
                return {};
            }
        }
        
        // ========== RENDER PAYMENT NUMBERS (INPUT FORM) ==========
        function renderPaymentNumbers() {
            const container = document.getElementById('paymentNumbersContainer');
            container.innerHTML = '';
            networkKeys.forEach((network, index) => {
                const method = paymentMethods[network];
                const item = document.createElement('div');
                item.className = 'payment-number-item';
                let networkClass = '';
                if (network.includes('Mascom')) networkClass = 'mascom';
                else if (network.includes('Orange')) networkClass = 'orange';
                else if (network.includes('BeMobile')) networkClass = 'bemobile';
                
                item.innerHTML = `
                    <div class="network-name ${networkClass}">
                        <i class="${method.icon || 'fas fa-wallet'}"></i> ${network}
                    </div>
                    <div class="account-name">
                        <i class="fas fa-user-circle"></i>
                        Holder: <span>${method.accountName}</span>
                    </div>
                    <div class="payment-number">
                        <span class="number-value">${method.number}</span>
                        <button class="copy-btn" data-number="${method.number}" data-label="${network}">
                            <i class="far fa-copy"></i> Copy
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
            
            container.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const number = this.dataset.number;
                    const label = this.dataset.label;
                    copyToClipboard(number, `${label} - number`);
                });
            });
        }
        
        // ========== RENDER INSTRUCTIONS TAB ==========
        function renderInstructionsTab() {
            const container = document.getElementById('dynamicInstructionsContainer');
            container.innerHTML = '';
            networkKeys.forEach(network => {
                const method = paymentMethods[network];
                const section = document.createElement('div');
                section.className = 'instructions-section';
                let colorStyle = `color: ${method.color};`;
                
                section.innerHTML = `
                    <h3 class="instructions-title" style="${colorStyle}">
                        <i class="${method.icon || 'fas fa-mobile-alt'}"></i> ${network}
                    </h3>
                    <ol class="instructions-list">
                        <li><strong>Dial your mobile money USSD code</strong> (e.g., *111# for Mascom)</li>
                        <li><strong>Select "Send Money" or "Transfer"</strong></li>
                        <li><strong>Enter payment number:</strong> ${method.number}</li>
                        <li><strong>Account holder:</strong> ${method.accountName}</li>
                        <li><strong>Amount:</strong> <span class="instruction-amount-placeholder">[amount]</span> BWP</li>
                        <li><strong>Enter your PIN</strong> to confirm</li>
                        <li><strong>Save the transaction reference</strong> you receive</li>
                    </ol>
                    <div class="instructions-note">
                        <i class="fas fa-exclamation-circle"></i>
                        <div>Verify the account holder (${method.accountName}) before sending. Operator charges apply.</div>
                    </div>
                `;
                container.appendChild(section);
            });
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'network-info';
            infoDiv.innerHTML = `
                <h4><i class="fas fa-info-circle"></i> Important Information</h4>
                <ul>
                    <li><i class="fas fa-check-circle"></i> Minimum amount: <strong>150 BWP</strong> | maximum: <strong>1,000,000 BWP</strong></li>
                    <li><i class="fas fa-check-circle"></i> Payments are processed within minutes</li>
                    <li><i class="fas fa-check-circle"></i> Use the correct number for each operator</li>
                    <li><i class="fas fa-check-circle"></i> Check the <strong>account holder</strong> before sending</li>
                </ul>
            `;
            container.appendChild(infoDiv);
        }
        
        // ========== DETECT OPERATOR FROM PHONE (Botswana) ==========
        function detectNetworkFromPhone(phoneDigits) {
            if (!phoneDigits || phoneDigits.length < 2) return null;
            const prefix = phoneDigits.substring(0, 2);
            for (let network of networkKeys) {
                const method = paymentMethods[network];
                if (method.prefixes && Array.isArray(method.prefixes) && method.prefixes.includes(prefix)) {
                    return network;
                }
            }
            return null;
        }
        
        function getPaymentDetails(networkKey) {
            const method = paymentMethods[networkKey];
            return method ? { number: method.number, accountName: method.accountName } : { number: '', accountName: '' };
        }
        
        async function checkPendingRequests() {
            if (!currentUser) return false;
            try {
                const snapshot = await database.ref('payments')
                    .orderByChild('userId')
                    .equalTo(currentUser.uid)
                    .once('value');
                if (snapshot.exists()) {
                    const payments = snapshot.val();
                    for (let key in payments) {
                        if (payments[key].status === 'pending') return true;
                    }
                }
                return false;
            } catch (e) {
                console.error(e);
                return false;
            }
        }
        
        // ========== MAIN FLOW ==========
        function showInputForm() {
            if (hasPendingRequest) {
                showErrorBar('Pending Request', 'Please wait for your previous request to be processed.');
                return;
            }
            document.getElementById('depositMainBtn').style.display = 'none';
            document.getElementById('inputForm').style.display = 'block';
            document.getElementById('verificationForm').style.display = 'none';
            document.getElementById('paymentNumbersContainer').style.display = 'none';
            document.getElementById('pendingWarning').style.display = 'none';
            document.getElementById('instructionsBar').classList.remove('active');
            
            document.getElementById('amountInput').value = '';
            document.getElementById('phoneInput').value = '';
            document.getElementById('amountDisplay').innerHTML = '';
            document.getElementById('amountDisplay').classList.remove('show', 'success', 'error', 'shake');
            currentAmount = 0; currentPhone = ''; detectedNetworkKey = '';
        }
        
        function goToMain() {
            document.getElementById('depositMainBtn').style.display = 'flex';
            document.getElementById('inputForm').style.display = 'none';
            document.getElementById('verificationForm').style.display = 'none';
            document.getElementById('instructionsBar').classList.remove('active');
            document.getElementById('successBar').classList.remove('active');
            document.getElementById('errorBar').classList.remove('active');
            if (hasPendingRequest) {
                document.getElementById('pendingWarning').style.display = 'block';
                document.getElementById('depositMainBtn').disabled = true;
                document.getElementById('depositMainBtn').classList.add('disabled');
            } else {
                document.getElementById('pendingWarning').style.display = 'none';
                document.getElementById('depositMainBtn').disabled = false;
                document.getElementById('depositMainBtn').classList.remove('disabled');
            }
        }
        
        function showInstructionsBar() {
            if (currentAmount < 10) { showErrorBar('Invalid amount', 'Minimum 10 BWP'); return; }
            if (!detectedNetworkKey) { showErrorBar('Invalid network', 'Number not recognized.'); return; }
            
            document.getElementById('instructionsAmount').textContent = formatAmount(currentAmount) + ' BWP';
            document.getElementById('instructionsNetwork').textContent = detectedNetworkKey;
            document.getElementById('instructionsPaymentNumber').textContent = currentPaymentNumber;
            document.getElementById('instructionsAccountName').textContent = currentAccountName;
            document.getElementById('instructionsReference').textContent = currentReference;
            document.getElementById('instructionsNote').innerHTML = `<i class="fas fa-exclamation-triangle"></i><div>Send exactly <strong>${formatAmount(currentAmount)} BWP</strong> to ${currentPaymentNumber} (${detectedNetworkKey}). Holder: ${currentAccountName}</div>`;
            
            document.getElementById('instructionsBar').classList.add('active');
            document.getElementById('inputForm').style.display = 'none';
        }
        
        function showVerificationForm() {
            document.getElementById('instructionsBar').classList.remove('active');
            document.getElementById('verificationForm').style.display = 'block';
            document.getElementById('summaryAmount').textContent = formatAmount(currentAmount) + ' BWP';
            document.getElementById('summaryPhone').textContent = currentPhone;
            document.getElementById('summaryNetwork').textContent = detectedNetworkKey;
            document.getElementById('summaryPaymentNumber').textContent = currentPaymentNumber;
            document.getElementById('summaryAccountName').textContent = currentAccountName;
            document.getElementById('senderNameInput').value = '';
            document.getElementById('transactionRefInput').value = '';
        }
        
        async function submitVerification() {
            const senderName = document.getElementById('senderNameInput').value.trim();
            const transactionRef = document.getElementById('transactionRefInput').value.trim();
            if (!senderName) { showErrorBar('Empty field', 'Please enter sender name.'); return; }
            if (!transactionRef) { showErrorBar('Empty field', 'Please enter transaction reference.'); return; }
            if (!currentUser) { showErrorBar('Session', 'Please log in first.'); return; }
            
            showCenterLoading(true, 'Submitting request...');
            try {
                const paymentData = {
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    phone: currentPhone,
                    amount: currentAmount,
                    network: detectedNetworkKey,
                    paymentNumber: currentPaymentNumber,
                    accountName: currentAccountName,
                    senderName: senderName,
                    transactionRef: transactionRef,
                    currency: 'BWP',
                    status: 'pending',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                await database.ref('payments').push(paymentData);
                hasPendingRequest = true;
                showCenterLoading(false);
                showSuccessBar('Deposit request submitted successfully!');
            } catch (error) {
                showCenterLoading(false);
                showErrorBar('Error', error.message);
            }
        }
        
        // ========== INITIALIZATION ==========
        window.addEventListener('DOMContentLoaded', async function() {
            await loadPaymentMethods();
            renderPaymentNumbers();
            renderInstructionsTab();
            
            // DOM references
            const paymentTabBtn = document.getElementById('paymentTabBtn');
            const instructionsTabBtn = document.getElementById('instructionsTabBtn');
            const paymentTab = document.getElementById('paymentTab');
            const instructionsTab = document.getElementById('instructionsTab');
            const depositMainBtn = document.getElementById('depositMainBtn');
            const backToMainBtn = document.getElementById('backToMainBtn');
            const backToInstructionsBtn = document.getElementById('backToInstructionsBtn');
            const amountInput = document.getElementById('amountInput');
            const phoneInput = document.getElementById('phoneInput');
            const amountDisplay = document.getElementById('amountDisplay');
            const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
            const backFromInstructionsBtn = document.getElementById('backFromInstructionsBtn');
            const proceedToPaymentBtn = document.getElementById('proceedToPaymentBtn');
            const submitVerificationBtn = document.getElementById('submitVerificationBtn');
            const closeSuccessBtn = document.getElementById('closeSuccessBtn');
            const viewStatusBtn = document.getElementById('viewStatusBtn');
            const closeErrorBtn = document.getElementById('closeErrorBtn');
            const retrySubmitBtn = document.getElementById('retrySubmitBtn');
            const copyPaymentNumberBtn = document.getElementById('copyPaymentNumberBtn');
            const copyInstructionsNumberBtn = document.getElementById('copyInstructionsNumberBtn');
            const copyInstructionsRefBtn = document.getElementById('copyInstructionsRefBtn');
            
            depositMainBtn.addEventListener('click', showInputForm);
            backToMainBtn.addEventListener('click', goToMain);
            backToInstructionsBtn.addEventListener('click', () => {
                document.getElementById('verificationForm').style.display = 'none';
                showInstructionsBar();
            });
            
            amountInput.addEventListener('input', function() {
                const amount = parseInt(this.value) || 0;
                currentAmount = amount;
                if (amount > 0) {
                    const validation = validateAmount(amount);
                    amountDisplay.textContent = validation.valid ? formatAmount(amount) + ' BWP' : validation.message;
                    amountDisplay.classList.add('show');
                    amountDisplay.classList.remove('success', 'error', 'shake');
                    amountDisplay.classList.add(validation.valid ? 'success' : 'error');
                    amountDisplay.classList.add('shake');
                    if (validation.valid) {
                        amountDisplay.innerHTML = `<span>${formatAmount(amount)} BWP</span> <i class="fas fa-check-circle verified-badge"></i>`;
                    }
                } else {
                    amountDisplay.classList.remove('show');
                }
            });
            
            phoneInput.addEventListener('input', function() {
                let digits = this.value.replace(/\D/g, '').slice(0, 8);
                this.value = digits;
                if (currentAmount < 10) { showErrorBar('Invalid amount', 'Please enter amount first.'); this.value = ''; return; }
                if (digits.length === 8 && isValidBotswanaPhone(digits)) {
                    currentPhone = digits;
                    const networkKey = detectNetworkFromPhone(digits);
                    if (networkKey) {
                        detectedNetworkKey = networkKey;
                        const details = getPaymentDetails(networkKey);
                        currentPaymentNumber = details.number;
                        currentAccountName = details.accountName;
                        currentReference = `DEPOSIT_${digits}`;
                        document.getElementById('paymentNumbersContainer').style.display = 'block';
                        setTimeout(() => { showInstructionsBar(); }, 500);
                    } else {
                        showErrorBar('Network not supported', 'Number does not match any Botswana operator.');
                        document.getElementById('paymentNumbersContainer').style.display = 'none';
                    }
                } else {
                    document.getElementById('paymentNumbersContainer').style.display = 'none';
                }
            });
            
            closeInstructionsBtn.addEventListener('click', goToMain);
            backFromInstructionsBtn.addEventListener('click', function() {
                document.getElementById('instructionsBar').classList.remove('active');
                document.getElementById('inputForm').style.display = 'block';
            });
            proceedToPaymentBtn.addEventListener('click', showVerificationForm);
            submitVerificationBtn.addEventListener('click', submitVerification);
            
            closeSuccessBtn.addEventListener('click', function() { document.getElementById('successBar').classList.remove('active'); goToMain(); });
            viewStatusBtn.addEventListener('click', () => alert('Status feature coming soon.'));
            closeErrorBtn.addEventListener('click', function() { document.getElementById('errorBar').classList.remove('active'); goToMain(); });
            retrySubmitBtn.addEventListener('click', function() { document.getElementById('errorBar').classList.remove('active'); document.getElementById('senderNameInput').focus(); });
            
            copyPaymentNumberBtn.addEventListener('click', function() {
                if (currentPaymentNumber) copyToClipboard(currentPaymentNumber, 'Payment number');
            });
            copyInstructionsNumberBtn.addEventListener('click', function() {
                if (currentPaymentNumber) copyToClipboard(currentPaymentNumber, 'Payment number');
            });
            copyInstructionsRefBtn.addEventListener('click', function() {
                copyToClipboard(currentReference, 'Reference');
            });
            
            paymentTabBtn.addEventListener('click', () => {
                paymentTabBtn.classList.add('active'); instructionsTabBtn.classList.remove('active');
                paymentTab.classList.add('active'); instructionsTab.classList.remove('active');
            });
            instructionsTabBtn.addEventListener('click', () => {
                instructionsTabBtn.classList.add('active'); paymentTabBtn.classList.remove('active');
                instructionsTab.classList.add('active'); paymentTab.classList.remove('active');
            });
            
            auth.onAuthStateChanged(async user => {
                if (user) {
                    currentUser = user;
                    hasPendingRequest = await checkPendingRequests();
                    if (hasPendingRequest) {
                        document.getElementById('pendingWarning').style.display = 'block';
                        depositMainBtn.disabled = true; depositMainBtn.classList.add('disabled');
                    }
                } else {
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                }
            });
            
            depositMainBtn.disabled = true; depositMainBtn.classList.add('disabled');
            setTimeout(() => {
                if (!hasPendingRequest) {
                    depositMainBtn.disabled = false; depositMainBtn.classList.remove('disabled');
                }
            }, 500);
        });