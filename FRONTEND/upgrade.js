// Firebase Config
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

        // Level data (no images)
        const upgradeLevels = [
            { id: 'level1', name: 'Level 1', price: 150, dailyReturn: 12, monthlyReturn: 360, yearlyReturn: 4320, description: 'Perfect start for beginners. Steady returns.' },
            { id: 'level2', name: 'Level 2', price: 300, dailyReturn: 25, monthlyReturn: 750, yearlyReturn: 9000, description: 'Enhanced features for growing portfolio.' },
            { id: 'level3', name: 'Level 3', price: 450, dailyReturn: 37, monthlyReturn: 1110, yearlyReturn: 13320, description: 'Premium features for serious investors.' },
            { id: 'level4', name: 'Level 4', price: 600, dailyReturn: 50, monthlyReturn: 1500, yearlyReturn: 18000, description: 'Advanced opportunities, excellent returns.' },
            { id: 'level5', name: 'Level 5', price: 1000, dailyReturn: 100, monthlyReturn: 3000, yearlyReturn: 36000, description: 'Professional level with exclusive benefits.' },
            { id: 'level6', name: 'Level 6', price: 1500, dailyReturn: 150, monthlyReturn: 4500, yearlyReturn: 54000, description: 'VIP access to premium strategies.' },
            { id: 'level7', name: 'Level 7', price: 2000, dailyReturn: 250, monthlyReturn: 7500, yearlyReturn: 90000, description: 'High-tier portfolio management.' },
            { id: 'level8', name: 'Level 8', price: 5000, dailyReturn: 625, monthlyReturn: 18750, yearlyReturn: 225000, description: 'Elite level with personal advisor.' },
            { id: 'level9', name: 'Level 9', price: 10000, dailyReturn: 2000, monthlyReturn: 60000, yearlyReturn: 720000, description: 'Premium investor status, special insights.' },
            { id: 'level10', name: 'Level 10', price: 20000, dailyReturn: 4000, monthlyReturn: 120000, yearlyReturn: 1440000, description: 'Highest tier, priority access.' }
        ];

        let currentUser = null;
        let userBalance = 0;
        let currentLevel = null;        // id of highest owned level
        let currentLevelData = null;    // full data object

        // Helper functions
        function showNotification(message, type = 'success') {
            const n = document.createElement('div');
            n.className = `notification ${type}`;
            let icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' :
                       type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' :
                       '<i class="fas fa-exclamation-triangle"></i>';
            n.innerHTML = `${icon}${message}`;
            document.getElementById('notificationContainer').appendChild(n);
            setTimeout(() => n.remove(), 3500);
        }

        function showSuccessPopup(prevData, newData, cost) {
            document.getElementById('successPopupTitle').innerText = 'Upgrade Successful!';
            document.getElementById('successPopupSubtitle').innerText = `Upgraded to ${newData.name}`;
            document.getElementById('successPreviousLevel').innerText = prevData ? prevData.name : 'None';
            document.getElementById('successDetailLevel').innerText = newData.name;
            document.getElementById('successDetailAmount').innerText = formatAmount(cost);
            document.getElementById('successDetailDaily').innerText = formatAmount(newData.dailyReturn);
            document.getElementById('successDetailMonthly').innerText = formatAmount(newData.monthlyReturn);
            document.getElementById('successDetailYearly').innerText = formatAmount(newData.yearlyReturn);
            document.getElementById('successPopupOverlay').style.display = 'flex';
        }

        function showErrorPopup(title, message) {
            document.getElementById('errorPopupTitle').innerText = title;
            document.getElementById('errorPopupMessage').innerText = message;
            document.getElementById('errorPopupOverlay').style.display = 'flex';
        }

        function showConfirmationPopup(prevData, newData, cost) {
            return new Promise((resolve) => {
                let html = `<strong>${newData.name}</strong><br><br>
                    <div class="popup-details">
                        <div class="popup-detail-row"><span>Upgrade cost:</span><span class="popup-detail-value">${formatAmount(cost)}</span></div>
                        <div class="popup-detail-row"><span>New daily return:</span><span class="popup-detail-value">${formatAmount(newData.dailyReturn)}</span></div>
                        <div class="popup-detail-row"><span>New monthly return:</span><span class="popup-detail-value">${formatAmount(newData.monthlyReturn)}</span></div>
                    </div>
                    Are you sure?`;
                document.getElementById('popupMessageContainer').innerHTML = html;
                document.getElementById('popupOverlay').style.display = 'flex';

                document.getElementById('popupConfirm').onclick = () => {
                    document.getElementById('popupOverlay').style.display = 'none';
                    resolve(true);
                };
                document.getElementById('popupCancel').onclick = () => {
                    document.getElementById('popupOverlay').style.display = 'none';
                    resolve(false);
                };
            });
        }

        function showLoading(msg) {
            document.getElementById('loadingText').innerText = msg;
            document.getElementById('loadingOverlay').style.display = 'flex';
        }
        function hideLoading() { document.getElementById('loadingOverlay').style.display = 'none'; }

        function formatAmount(amt) { return amt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' BWP'; }

        function formatDate(ts) {
            return new Date(ts).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        }

        // Calculate upgrade cost (difference between target and current level price)
        function getUpgradeCost(target) {
            if (!currentLevelData) return target.price;
            return target.price - currentLevelData.price;
        }

        // Render cards (no images)
        function renderUpgradeCards() {
            const container = document.getElementById('upgradeLevelsContainer');
            container.innerHTML = '';

            upgradeLevels.forEach(level => {
                const cost = getUpgradeCost(level);
                const isOwned = currentLevel === level.id;
                const isHigher = currentLevelData ? level.price > currentLevelData.price : true;
                let btnText = '', disabled = false;

                if (isOwned) { btnText = 'Current Level ✓'; disabled = true; }
                else if (!isHigher) { btnText = 'Already Higher Level'; disabled = true; }
                else if (userBalance < cost) { btnText = `Need ${formatAmount(cost - userBalance)} more`; disabled = true; }
                else { btnText = `Upgrade ${formatAmount(cost)}`; disabled = false; }

                const card = document.createElement('div');
                card.className = 'level-card';
                card.innerHTML = `
                    <div class="level-badge">${level.name}</div>
                    <div class="level-header">
                        <div class="level-title">${level.name}</div>
                        <div class="level-price">${formatAmount(level.price)}</div>
                    </div>
                    <div class="level-description">${level.description}</div>
                    <div class="level-details">
                        <div class="detail-row"><span class="detail-label"><i class="fas fa-sun"></i> Daily:</span><span class="detail-value">${formatAmount(level.dailyReturn)}</span></div>
                        <div class="detail-row"><span class="detail-label"><i class="fas fa-calendar-alt"></i> Monthly:</span><span class="detail-value">${formatAmount(level.monthlyReturn)}</span></div>
                        <div class="detail-row"><span class="detail-label"><i class="fas fa-calendar-check"></i> Yearly:</span><span class="detail-value">${formatAmount(level.yearlyReturn)}</span></div>
                        <div class="detail-row"><span class="detail-label"><i class="fas fa-arrow-up"></i> Upgrade cost:</span><span class="detail-value">${formatAmount(cost)}</span></div>
                    </div>
                    <button class="upgrade-btn" id="${level.id}-btn" ${disabled ? 'disabled' : ''}>
                        <span class="button-spinner" id="spinner-${level.id}"></span>
                        <i class="fas fa-arrow-up"></i> <span class="button-text">${btnText}</span>
                    </button>
                `;
                container.appendChild(card);

                if (!disabled) {
                    document.getElementById(`${level.id}-btn`).addEventListener('click', () => handleUpgrade(level));
                }
            });
        }

        // Load upgrade history
        function loadHistory(uid) {
            const hist = document.getElementById('historyContainer');
            database.ref(`upgradeHistory/${uid}`).orderByChild('timestamp').once('value')
                .then(snap => {
                    if (!snap.exists()) {
                        hist.innerHTML = '<div class="no-history">No upgrade history yet</div>';
                        return;
                    }
                    hist.innerHTML = '';
                    const items = [];
                    snap.forEach(ch => items.push(ch.val()));
                    items.reverse().forEach(h => {
                        const card = document.createElement('div');
                        card.className = 'history-card';
                        card.innerHTML = `
                            <div class="history-level">${h.fromLevel ? h.fromLevel+' → ' : ''}${h.toLevel}</div>
                            <div class="history-date">${formatDate(h.timestamp)}</div>
                            <div class="history-amount">-${formatAmount(h.upgradeCost)}</div>
                        `;
                        hist.appendChild(card);
                    });
                })
                .catch(() => hist.innerHTML = '<div class="no-history">Error loading history</div>');
        }

        // Main upgrade handler (same structure as investment page)
        async function handleUpgrade(target) {
            if (!currentUser) { showNotification('Login required', 'error'); return; }
            const cost = getUpgradeCost(target);
            if (cost <= 0) { showErrorPopup('Invalid Upgrade', 'Cannot downgrade.'); return; }
            if (userBalance < cost) {
                showErrorPopup('Insufficient Balance', `Need ${formatAmount(cost - userBalance)} more.`);
                return;
            }

            const confirmed = await showConfirmationPopup(currentLevelData, target, cost);
            if (!confirmed) return;

            showLoading('Processing upgrade...');
            const btn = document.getElementById(`${target.id}-btn`);
            const spinner = document.getElementById(`spinner-${target.id}`);
            const btnText = btn.querySelector('.button-text');
            if (spinner) spinner.style.display = 'inline-block';
            if (btnText) btnText.innerText = 'Processing...';

            try {
                const newBalance = userBalance - cost;
                const updates = {};

                // Update balance
                updates[`users/${currentUser.uid}/balance`] = newBalance;

                // Remove old level if exists (overwrite)
                if (currentLevelData) {
                    updates[`users/${currentUser.uid}/levels/${currentLevelData.id}`] = null;
                }

                // Add new level (structure identical to invest page)
                updates[`users/${currentUser.uid}/levels/${target.id}`] = {
                    unlockedAt: firebase.database.ServerValue.TIMESTAMP,
                    amount: target.price,
                    dailyReturn: target.dailyReturn,
                    monthlyReturn: target.monthlyReturn,
                    yearlyReturn: target.yearlyReturn,
                    upgradeType: 'upgrade',
                    previousLevel: currentLevelData ? currentLevelData.id : null,
                    upgradeCost: cost
                };

                // Add to upgrade history
                const upgradeId = database.ref('upgradeHistory').push().key;
                updates[`upgradeHistory/${currentUser.uid}/${upgradeId}`] = {
                    fromLevel: currentLevelData ? currentLevelData.id : null,
                    toLevel: target.id,
                    upgradeCost: cost,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };

                // Add transaction (like invest page)
                const txId = database.ref('transactions').push().key;
                updates[`transactions/${txId}`] = {
                    userId: currentUser.uid,
                    type: 'upgrade',
                    level: target.id,
                    levelName: target.name,
                    amount: cost,
                    dailyReturn: target.dailyReturn,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    status: 'completed'
                };

                await database.ref().update(updates);

                // Update local state
                userBalance = newBalance;
                currentLevel = target.id;
                currentLevelData = target;

                // UI updates
                document.getElementById('userBalance').innerText = formatAmount(userBalance);
                document.getElementById('currentLevelName').innerText = target.name;
                document.getElementById('currentLevelPrice').innerText = `(${formatAmount(target.price)})`;
                renderUpgradeCards();
                loadHistory(currentUser.uid);

                hideLoading();
                showSuccessPopup(currentLevelData ? currentLevelData : null, target, cost);
            } catch (err) {
                hideLoading();
                if (spinner) spinner.style.display = 'none';
                if (btnText) btnText.innerText = `Upgrade ${formatAmount(cost)}`;
                showErrorPopup('Upgrade Failed', err.message);
            }
        }

        // Auth & init
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                document.getElementById('userEmail').innerText = user.email;

                showLoading('Loading data...');
                try {
                    const snap = await database.ref(`users/${user.uid}`).once('value');
                    const data = snap.val();
                    if (data) {
                        userBalance = data.balance || 0;
                        // find highest owned level
                        if (data.levels) {
                            let highestPrice = 0;
                            for (const lid in data.levels) {
                                const lvl = upgradeLevels.find(l => l.id === lid);
                                if (lvl && lvl.price > highestPrice) {
                                    highestPrice = lvl.price;
                                    currentLevel = lid;
                                    currentLevelData = lvl;
                                }
                            }
                        }
                        document.getElementById('userBalance').innerText = formatAmount(userBalance);
                        document.getElementById('currentLevelName').innerText = currentLevelData ? currentLevelData.name : 'None';
                        if (currentLevelData) {
                            document.getElementById('currentLevelPrice').innerText = `(${formatAmount(currentLevelData.price)})`;
                        }
                    }
                    renderUpgradeCards();
                    loadHistory(user.uid);
                    hideLoading();
                } catch (err) {
                    hideLoading();
                    showErrorPopup('Error', 'Failed to load user data.');
                }
            } else {
                window.location.href = 'login.html';
            }
        });

        // Popup close handlers
        document.getElementById('successPopupOkBtn').addEventListener('click', () => {
            document.getElementById('successPopupOverlay').style.display = 'none';
        });
        document.getElementById('errorPopupOkBtn').addEventListener('click', () => {
            document.getElementById('errorPopupOverlay').style.display = 'none';
        });