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

        // Initialize Firebase (if not already)
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const database = firebase.database();

        // Current user data
        let currentUser = null;
        let userBalance = 0;
        let withdrawalAccount = null;
        let pendingWithdrawal = false;
        let currentAmount = 0;
        let userId = null;
        let allNotifications = [];
        let unreadCount = 0;

        // Network logos (placeholders, you can replace with actual paths)
        const networkLogos = {
            'Mascom MyZaka': 'myzaka.png',
            'Orange Money': 'Orange.png',
            'BeMobile Money': 'bemo.png',
            'Halopesa': 'halo.png'
        };

        // ---------- Helper functions ----------
        function formatAmount(amount) {
            return (amount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " BWP";
        }

        function showNotification(message, type = 'success') {
            const container = document.getElementById('notificationContainer');
            const notif = document.createElement('div');
            notif.className = `notification ${type}`;
            let icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' :
                       type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' :
                       '<i class="fas fa-exclamation-triangle"></i>';
            notif.innerHTML = `${icon}${message}`;
            container.appendChild(notif);
            setTimeout(() => notif.remove(), 3500);
        }

        function showLoading(message) {
            document.getElementById('loadingText').textContent = message;
            document.getElementById('loadingOverlay').style.display = 'flex';
        }
        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }

        function showSuccessPopup(amount, phoneNumber, network) {
            const taxRate = 0.13;
            const taxAmount = amount * taxRate;
            const afterTax = amount - taxAmount;
            document.getElementById('successAmountRequested').textContent = formatAmount(amount);
            document.getElementById('successTaxAmount').textContent = formatAmount(taxAmount);
            document.getElementById('successAfterTax').textContent = formatAmount(afterTax);
            document.getElementById('successPhoneNumber').textContent = phoneNumber;
            document.getElementById('successNetwork').textContent = network;
            document.getElementById('successYouReceive').textContent = formatAmount(afterTax);
            document.getElementById('successPopup').classList.add('active');
        }
        function hideSuccessPopup() {
            document.getElementById('successPopup').classList.remove('active');
            document.getElementById('amountInput').value = '';
        }

        function showConfirmModal(amount, phoneNumber) {
            document.getElementById('withdrawAmount').textContent = formatAmount(amount);
            document.getElementById('withdrawNumber').textContent = phoneNumber;
            document.getElementById('confirmModal').style.display = 'flex';
        }
        function hideConfirmModal() {
            document.getElementById('confirmModal').style.display = 'none';
        }

        function showErrorModal(title, message) {
            document.getElementById('errorTitle').textContent = title;
            document.getElementById('errorMessage').textContent = message;
            document.getElementById('errorModal').style.display = 'flex';
        }
        function hideErrorModal() {
            document.getElementById('errorModal').style.display = 'none';
        }

        async function checkPendingWithdrawal(userId) {
            try {
                const snapshot = await database.ref('withdrawals')
                    .orderByChild('userId')
                    .equalTo(userId)
                    .once('value');
                if (snapshot.exists()) {
                    let hasPending = false;
                    snapshot.forEach(child => {
                        if (child.val().status === 'pending') hasPending = true;
                    });
                    return hasPending;
                }
                return false;
            } catch (error) {
                console.error('Error checking pending withdrawals:', error);
                return false;
            }
        }

        function validateAmount(amount) {
            if (isNaN(amount) || amount <= 0) return { valid: false, message: 'Please enter a valid amount' };
            if (amount < 30) return { valid: false, message: 'Minimum withdrawal amount is 30 BWP' };
            if (amount > 20000) return { valid: false, message: 'Maximum withdrawal amount is 20,000 BWP per transaction' };
            if (amount > userBalance) return { valid: false, message: 'You don\'t have enough balance' };
            return { valid: true };
        }

        async function processWithdrawal() {
            const amountInput = document.getElementById('amountInput');
            const amount = parseFloat(amountInput.value);
            currentAmount = amount;
            const validation = validateAmount(amount);
            if (!validation.valid) {
                showErrorModal('Invalid Amount', validation.message);
                return;
            }
            if (!withdrawalAccount) {
                showErrorModal('Error', 'No withdrawal account found. Please set up your withdrawal account first.');
                return;
            }
            if (pendingWithdrawal) {
                showErrorModal('Pending Withdrawal', 'You have a pending withdrawal request. Please wait for it to be processed before making a new request.');
                return;
            }
            showConfirmModal(amount, withdrawalAccount.phoneNumber);
        }

        async function submitWithdrawal() {
            const amount = currentAmount;
            showLoading('Processing withdrawal...');
            try {
                const hasPending = await checkPendingWithdrawal(currentUser.uid);
                if (hasPending) {
                    hideLoading();
                    hideConfirmModal();
                    showErrorModal('Pending Withdrawal', 'You already have a pending withdrawal request. Please wait for it to be processed.');
                    pendingWithdrawal = true;
                    document.getElementById('withdrawBtn').disabled = true;
                    return;
                }

                const withdrawalData = {
                    userId: currentUser.uid,
                    amount: amount,
                    phoneNumber: withdrawalAccount.phoneNumber,
                    network: withdrawalAccount.network,
                    status: 'pending',
                    fullName: withdrawalAccount.fullName,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };

                const withdrawalRef = database.ref('withdrawals').push();
                await withdrawalRef.set(withdrawalData);

                // Update user balance (deduct immediately)
                const newBalance = userBalance - amount;
                await database.ref(`users/${currentUser.uid}/balance`).set(newBalance);
                userBalance = newBalance;
                pendingWithdrawal = true;

                hideLoading();
                hideConfirmModal();
                showSuccessPopup(amount, withdrawalAccount.phoneNumber, withdrawalAccount.network);
                document.getElementById('withdrawBtn').disabled = true;
            } catch (error) {
                hideLoading();
                hideConfirmModal();
                showErrorModal('Error', 'Failed to process withdrawal. Please try again later.');
                console.error(error);
            }
        }

        // ---------- Notification functions (for top bar) ----------
        function formatDate(ts) {
            const d = new Date(ts);
            const now = new Date();
            const diff = now - d;
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff/60000)} min ago`;
            if (diff < 86400000) return `${Math.floor(diff/3600000)} hr ago`;
            return d.toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        }

        function updateNotificationBadge() {
            const badge = document.getElementById('notificationBadge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        function renderNotificationDropdown(notifs) {
            const container = document.getElementById('notificationDropdownBody');
            if (!notifs || notifs.length === 0) {
                container.innerHTML = `<div class="dropdown-item">✨ no notifications</div>`;
                return;
            }
            let html = '';
            notifs.slice(0,5).forEach(n => {
                html += `<div class="dropdown-item ${n.read ? '' : 'unread'}">
                    <div class="item-title">${n.title || 'Notification'}</div>
                    <div class="item-message">${(n.message||'').substring(0,60)}</div>
                    <div class="item-time">${formatDate(n.timestamp)}</div>
                </div>`;
            });
            container.innerHTML = html;
        }

        async function loadUserNotifications() {
            try {
                userId = currentUser.uid;
                const readSnap = await database.ref(`userReadAnnouncements/${userId}`).once('value');
                const readAnnouncements = readSnap.val() || {};

                const annSnap = await database.ref('announcements').once('value');
                let announcements = [];
                if (annSnap.exists()) {
                    annSnap.forEach(child => {
                        let a = child.val(); a.id = child.key; a.type='announcement';
                        a.read = readAnnouncements[a.id] ? true : false;
                        announcements.push(a);
                    });
                }

                const notifSnap = await database.ref(`userNotifications/${userId}`).once('value');
                let userNotifications = [];
                if (notifSnap.exists()) {
                    notifSnap.forEach(c => { let n = c.val(); n.id = c.key; n.type='withdrawal'; userNotifications.push(n); });
                }

                allNotifications = [...announcements, ...userNotifications].sort((a,b)=> (b.timestamp||0)-(a.timestamp||0));
                unreadCount = allNotifications.filter(n => !n.read).length;
                updateNotificationBadge();
                renderNotificationDropdown(allNotifications);
            } catch (e) { console.warn(e); }
        }

        window.markAsRead = async (id, type) => {
            const notif = allNotifications.find(n => n.id === id);
            if (!notif || notif.read) return;
            if (type === 'announcement') {
                await database.ref(`userReadAnnouncements/${userId}/${id}`).set({ read: true, timestamp: Date.now() });
            } else {
                await database.ref(`userNotifications/${userId}/${id}/read`).set(true);
            }
            notif.read = true;
            unreadCount = allNotifications.filter(n => !n.read).length;
            updateNotificationBadge();
            renderNotificationDropdown(allNotifications);
        };

        // ---------- Event listeners ----------
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('confirmWithdrawBtn').addEventListener('click', submitWithdrawal);
            document.getElementById('cancelWithdrawBtn').addEventListener('click', hideConfirmModal);
            document.getElementById('errorOkBtn').addEventListener('click', hideErrorModal);
            document.getElementById('closeSuccessPopupBtn').addEventListener('click', hideSuccessPopup);
            document.getElementById('withdrawBtn').addEventListener('click', processWithdrawal);

            document.getElementById('amountInput').addEventListener('input', function() {
                const amount = parseFloat(this.value);
                const validation = validateAmount(amount);
                this.style.borderColor = validation.valid ? '#90e0ef' : '#ef233c';
            });

            // Notification bell
            document.getElementById('notificationBell').addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('notificationDropdown').classList.toggle('active');
            });
            document.addEventListener('click', (e) => {
                const dd = document.getElementById('notificationDropdown');
                if (!dd.contains(e.target) && !e.target.closest('.notification-bell')) dd.classList.remove('active');
            });
        });

        // ---------- Auth & init ----------
        auth.onAuthStateChanged(async user => {
            if (user) {
                currentUser = user;
                showLoading('Loading account data...');
                try {
                    const userRef = database.ref(`users/${user.uid}`);
                    userRef.on('value', async (snapshot) => {
                        const userData = snapshot.val();
                        if (userData) {
                            userBalance = userData.balance || 0;
                            document.getElementById('accountBalance').innerText = formatAmount(userBalance);
                            document.getElementById('cumulativeBalance').innerText = formatAmount(userData.deposited || 0);

                            if (userData.withdrawalAccount) {
                                withdrawalAccount = userData.withdrawalAccount;
                                document.getElementById('phoneNumber').textContent = withdrawalAccount.phoneNumber;
                                document.getElementById('networkName').textContent = withdrawalAccount.network;
                                const logoUrl = networkLogos[withdrawalAccount.network] || '';
                                if (logoUrl) {
                                    document.getElementById('networkLogo').src = logoUrl;
                                    document.getElementById('networkLogo').style.display = 'block';
                                }
                            }

                            pendingWithdrawal = await checkPendingWithdrawal(user.uid);
                            const withdrawBtn = document.getElementById('withdrawBtn');
                            withdrawBtn.disabled = !withdrawalAccount || pendingWithdrawal;

                            if (pendingWithdrawal) {
                                showNotification('You have a pending withdrawal request. Please wait for it to be processed.', 'error');
                            } else if (!withdrawalAccount) {
                                showNotification('Please set up your withdrawal account first.', 'error');
                            }
                        }
                        hideLoading();
                    });

                    // Load notifications
                    await loadUserNotifications();
                } catch (error) {
                    hideLoading();
                    showErrorModal('Error', 'Failed to load account data. Please try again.');
                }
            } else {
                window.location.href = 'login.html';
            }
        });