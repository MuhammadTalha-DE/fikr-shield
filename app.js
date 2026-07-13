/* ============================================
   FIKR SHIELD - Complete Application Logic
   ============================================ */

class FikrShield {
    constructor() {
        this.currentDate = this.getDateString();
        this.data = this.loadData();
        this.settings = this.loadSettings();
        this.analyticsRange = 'week';
        this.charts = {};
        this.init();
    }

    getDateString(date = new Date()) {
        return date.toISOString().split('T')[0];
    }

    init() {
        // Hide splash screen after load
        setTimeout(() => {
            document.getElementById('splashScreen').classList.add('hide');
            document.getElementById('appContainer').style.display = 'block';
        }, 1500);

        this.initializeTabs();
        this.initializeToday();
        this.setupEventListeners();
        this.updateAllUI();
        this.initializeNotifications();
        this.checkDayChange();
        this.generateShareCode();
    }

    // Data Management
    loadData() {
        const defaultData = {
            streak: 0,
            bestStreak: 0,
            totalDays: 0,
            totalHoursSaved: 0,
            days: {},
            partners: [],
            moodHistory: {},
            journalEntries: {},
            achievements: []
        };
        
        try {
            const saved = localStorage.getItem('fikrShieldData');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch (e) {
            return defaultData;
        }
    }

    saveData() {
        try {
            localStorage.setItem('fikrShieldData', JSON.stringify(this.data));
        } catch (e) {
            this.showToast('Storage full. Please export your data.', 'warning');
        }
    }

    loadSettings() {
        const defaultSettings = {
            theme: 'dark',
            shieldName: 'My Daily Shield',
            notifications: {
                morning: { enabled: true, time: '07:00' },
                midday: { enabled: true, time: '12:00' },
                evening: { enabled: true, time: '21:00' },
                dangerAlert: { enabled: true }
            },
            shareCode: this.generateCode()
        };

        try {
            const saved = localStorage.getItem('fikrShieldSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (e) {
            return defaultSettings;
        }
    }

    saveSettings() {
        localStorage.setItem('fikrShieldSettings', JSON.stringify(this.settings));
    }

    generateCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Tab Navigation
    initializeTabs() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Tab`).classList.add('active');

        if (tab === 'analytics') this.renderAnalytics();
        if (tab === 'community') this.renderCommunity();
        if (tab === 'settings') this.loadSettingsUI();
    }

    // Initialize Today's Data
    initializeToday() {
        if (!this.data.days[this.currentDate]) {
            this.data.days[this.currentDate] = {
                completed: false,
                bedtimeConfirmed: false,
                shields: {
                    mindlessScrolling: false,
                    socialMedia: false,
                    entertainment: false,
                    adultContent: false
                },
                mood: null,
                journal: '',
                timestamp: null,
                hoursSaved: 0
            };
            this.saveData();
        }

        this.loadTodayUI();
    }

    loadTodayUI() {
        const today = this.data.days[this.currentDate];
        
        if (today.completed) {
            const btn = document.getElementById('commitButton');
            btn.classList.add('completed');
            btn.querySelector('.button-text').textContent = '🛡️ Shield Active - Day Complete!';
            document.getElementById('commitmentCard').classList.add('completed');
        }

        // Load shields
        const shields = ['mindlessScrolling', 'socialMedia', 'entertainment', 'adultContent'];
        shields.forEach((shield, i) => {
            document.getElementById(`shield${i + 1}`).checked = today.shields[shield];
        });

        // Load mood
        if (today.mood) {
            document.querySelector(`[data-mood="${today.mood}"]`)?.classList.add('active');
        }

        // Load journal
        if (today.journal) {
            document.getElementById('journalEntry').value = today.journal;
            document.getElementById('charCount').textContent = today.journal.length;
        }

        this.updateProgress();
        this.updateTimeSaved();
    }

    // Event Listeners
    setupEventListeners() {
        // Commitment button
        document.getElementById('commitButton').addEventListener('click', () => this.completeCommitment());

        // Bedtime buttons
        document.getElementById('bedtimeConfirm').addEventListener('click', () => this.bedtimeCheckin(true));
        document.getElementById('bedtimeReflect').addEventListener('click', () => this.bedtimeCheckin(false));

        // Shield checkboxes
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`shield${i}`).addEventListener('change', (e) => {
                this.updateShield(i - 1, e.target.checked);
            });
        }

        // Mood buttons
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateMood(btn.dataset.mood);
            });
        });

        // Journal
        const journalEntry = document.getElementById('journalEntry');
        journalEntry.addEventListener('input', () => {
            document.getElementById('charCount').textContent = journalEntry.value.length;
        });
        document.getElementById('saveJournalBtn').addEventListener('click', () => this.saveJournal());

        // Analytics range buttons
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.analyticsRange = btn.dataset.range;
                this.renderAnalytics();
            });
        });

        // Settings listeners
        document.getElementById('themeSelect').addEventListener('change', (e) => this.updateTheme(e.target.value));
        document.getElementById('shieldName').addEventListener('change', (e) => this.updateShieldName(e.target.value));
        
        // Notification settings
        ['morning', 'midday', 'evening'].forEach(type => {
            document.getElementById(`${type}Reminder`).addEventListener('change', (e) => {
                this.settings.notifications[type].enabled = e.target.checked;
                this.saveSettings();
                this.scheduleNotifications();
            });
            document.getElementById(`${type}Time`).addEventListener('change', (e) => {
                this.settings.notifications[type].time = e.target.value;
                this.saveSettings();
                this.scheduleNotifications();
            });
        });

        document.getElementById('dangerAlert').addEventListener('change', (e) => {
            this.settings.notifications.dangerAlert.enabled = e.target.checked;
            this.saveSettings();
        });

        // Export/Import/Reset
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportAllData());
        document.getElementById('importDataBtn').addEventListener('click', () => this.importData());
        document.getElementById('resetDataBtn').addEventListener('click', () => this.resetAllData());
        document.getElementById('exportAnalyticsBtn').addEventListener('click', () => this.exportAnalyticsReport());

        // Community
        document.getElementById('addPartnerBtn').addEventListener('click', () => this.openAddPartnerModal());
        document.getElementById('connectPartnerBtn').addEventListener('click', () => this.connectPartner());
        document.getElementById('copyCodeBtn').addEventListener('click', () => this.copyShareCode());

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
    }

    // Commitment Logic
    completeCommitment() {
        const today = this.data.days[this.currentDate];
        
        if (today.completed) return;

        today.completed = true;
        today.timestamp = new Date().toISOString();
        
        this.updateStreakData();
        this.calculateHoursSaved();
        this.saveData();
        this.loadTodayUI();
        this.updateAllUI();
        
        // Celebrations
        this.triggerCelebration();
        
        if (this.data.streak === 7) this.showAchievement('1 Week Streak!', '🌟');
        if (this.data.streak === 30) this.showAchievement('30 Day Warrior!', '⚔️');
        if (this.data.streak === 90) this.showAchievement('90 Day Legend!', '👑');
        if (this.data.streak === 365) this.showAchievement('1 Year of Discipline!', '🏆');
    }

    updateStreakData() {
        const yesterday = this.getDateString(new Date(Date.now() - 86400000));
        
        if (this.data.days[yesterday]?.completed) {
            this.data.streak++;
        } else {
            this.data.streak = 1;
        }

        if (this.data.streak > this.data.bestStreak) {
            this.data.bestStreak = this.data.streak;
        }

        this.data.totalDays++;
    }

    calculateHoursSaved() {
        const today = this.data.days[this.currentDate];
        const hoursMap = { mindlessScrolling: 2, socialMedia: 1.5, entertainment: 2.5, adultContent: 1 };
        let total = 0;
        
        Object.entries(today.shields).forEach(([key, value]) => {
            if (value) total += hoursMap[key] || 0;
        });
        
        today.hoursSaved = total;
        this.data.totalHoursSaved = Object.values(this.data.days).reduce((sum, day) => sum + (day.hoursSaved || 0), 0);
    }

    bedtimeCheckin(success) {
        const today = this.data.days[this.currentDate];
        today.bedtimeConfirmed = success;
        
        if (success) {
            this.showAchievement('Day Complete! Rest well 🛡️', '🌙');
        }
        
        this.saveData();
        this.updateAllUI();
    }

    updateShield(index, value) {
        const keys = ['mindlessScrolling', 'socialMedia', 'entertainment', 'adultContent'];
        this.data.days[this.currentDate].shields[keys[index]] = value;
        this.calculateHoursSaved();
        this.saveData();
        this.updateProgress();
        this.updateTimeSaved();
    }

    updateMood(mood) {
        this.data.days[this.currentDate].mood = mood;
        this.data.moodHistory[this.currentDate] = mood;
        this.saveData();
    }

    saveJournal() {
        const journal = document.getElementById('journalEntry').value;
        this.data.days[this.currentDate].journal = journal;
        this.data.journalEntries[this.currentDate] = journal;
        this.saveData();
        this.showToast('Reflection saved! 📝', 'success');
    }

    // UI Updates
    updateAllUI() {
        this.updateStreakDisplay();
        this.updateTimeSaved();
        this.updateProgress();
        this.updateReminderStatus();
        this.setDailyQuote();
    }

    updateStreakDisplay() {
        document.getElementById('streakCount').textContent = this.data.streak;
        document.getElementById('totalHoursSaved').textContent = Math.round(this.data.totalHoursSaved);
        document.getElementById('accountabilityPartners').textContent = this.data.partners.length;
    }

    updateProgress() {
        const today = this.data.days[this.currentDate];
        const shields = Object.values(today.shields);
        const activeShields = shields.filter(v => v).length;
        const progress = shields.length > 0 ? (activeShields / shields.length) * 100 : 0;

        document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
        document.getElementById('miniProgressText').textContent = `${Math.round(progress)}%`;
        
        // Update progress rings
        const circumference = 565.48;
        const offset = circumference - (progress / 100) * circumference;
        document.getElementById('progressRing').style.strokeDashoffset = offset;
        
        const miniCirc = 157;
        const miniOffset = miniCirc - (progress / 100) * miniCirc;
        document.getElementById('miniProgress').style.strokeDashoffset = miniOffset;
    }

    updateTimeSaved() {
        const today = this.data.days[this.currentDate];
        document.getElementById('timeSavedToday').textContent = 
            `${today.hoursSaved || 0} hours`;
    }

    updateReminderStatus() {
        const evening = this.settings.notifications.evening;
        const statusText = document.getElementById('reminderStatusText');
        
        if (evening.enabled) {
            statusText.textContent = `Evening reminder set for ${this.formatTime(evening.time)}`;
            document.querySelector('.reminder-dot').classList.add('active');
        } else {
            statusText.textContent = 'No reminders set';
            document.querySelector('.reminder-dot').classList.remove('active');
        }
    }

    formatTime(time) {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${m} ${ampm}`;
    }

    setDailyQuote() {
        const quotes = [
            { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
            { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
            { text: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell" },
            { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
            { text: "The pain of discipline is far less than the pain of regret.", author: "Sarah Bombell" },
            { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
            { text: "Self-discipline is the magic power that makes you virtually unstoppable.", author: "Dan Kennedy" },
            { text: "The first and best victory is to conquer self.", author: "Plato" }
        ];
        
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        document.getElementById('dailyQuote').textContent = quote.text;
        document.getElementById('quoteAuthor').textContent = `- ${quote.author}`;
    }

    // Notifications
    async initializeNotifications() {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'default') {
            setTimeout(() => {
                document.getElementById('notificationModal').style.display = 'flex';
            }, 3000);
        }

        document.getElementById('enableNotificationsBtn').addEventListener('click', async () => {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.scheduleNotifications();
                document.getElementById('notificationModal').style.display = 'none';
                this.showToast('Notifications enabled! 🔔', 'success');
            }
        });

        document.getElementById('skipNotificationsBtn').addEventListener('click', () => {
            document.getElementById('notificationModal').style.display = 'none';
        });

        if (Notification.permission === 'granted') {
            this.scheduleNotifications();
        }
    }

    scheduleNotifications() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const types = ['morning', 'midday', 'evening'];
        const messages = {
            morning: { title: '🌅 Good Morning!', body: 'Ready to activate your shield today? Your discipline journey continues!' },
            midday: { title: '🛡️ Midday Check-in', body: 'How is your shield holding up? Stay strong!' },
            evening: { title: '🌙 Evening Reflection', body: 'Time to reflect on your day. Did your shield stay strong?' }
        };

        types.forEach(type => {
            const setting = this.settings.notifications[type];
            if (setting.enabled) {
                this.scheduleDailyNotification(type, setting.time, messages[type]);
            }
        });

        // Danger alert at 10 PM
        if (this.settings.notifications.dangerAlert.enabled) {
            this.scheduleDailyNotification('danger', '22:00', {
                title: '⚠️ Streak Alert!',
                body: 'You haven\'t completed your check-in yet. Protect your streak!'
            });
        }
    }

    scheduleDailyNotification(id, time, message) {
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        let scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const delay = scheduledTime.getTime() - now.getTime();
        
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification(message.title, {
                    body: message.body,
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-72.png',
                    tag: id,
                    requireInteraction: id === 'evening' || id === 'danger'
                });
            }
            // Reschedule for next day
            this.scheduleDailyNotification(id, time, message);
        }, delay);
    }

    // Analytics
    renderAnalytics() {
        this.updateAnalyticsOverview();
        this.renderStreakChart();
        this.renderTimeWastersChart();
        this.renderMoodChart();
        this.renderProductivityChart();
        this.renderHeatmap();
    }

    updateAnalyticsOverview() {
        document.getElementById('analyticsTotalDays').textContent = this.data.totalDays;
        document.getElementById('analyticsBestStreak').textContent = this.data.bestStreak;
        
        const totalPossible = Object.keys(this.data.days).length;
        const rate = totalPossible > 0 ? ((this.data.totalDays / totalPossible) * 100).toFixed(1) : 0;
        document.getElementById('analyticsSuccessRate').textContent = `${rate}%`;
        document.getElementById('analyticsTotalHours').textContent = Math.round(this.data.totalHoursSaved);
    }

    renderStreakChart() {
        const ctx = document.getElementById('streakChart');
        if (this.charts.streak) this.charts.streak.destroy();

        const data = this.getDateRangeData();
        
        this.charts.streak = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Daily Completion',
                    data: data.completions,
                    borderColor: '#4ecca3',
                    backgroundColor: 'rgba(78,204,163,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#4ecca3'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 1, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    renderTimeWastersChart() {
        const ctx = document.getElementById('timeWastersChart');
        if (this.charts.timeWasters) this.charts.timeWasters.destroy();

        const categories = ['Scrolling', 'Social Media', 'Entertainment', 'Adult Content'];
        const totals = [0, 0, 0, 0];
        
        Object.values(this.data.days).forEach(day => {
            const shields = day.shields;
            if (shields.mindlessScrolling) totals[0]++;
            if (shields.socialMedia) totals[1]++;
            if (shields.entertainment) totals[2]++;
            if (shields.adultContent) totals[3]++;
        });

        this.charts.timeWasters = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: totals,
                    backgroundColor: ['#4ecca3', '#4ecdc4', '#ffd93d', '#ff6b6b']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9fa8da' } }
                }
            }
        });
    }

    renderMoodChart() {
        const ctx = document.getElementById('moodChart');
        if (this.charts.mood) this.charts.mood.destroy();

        const moods = ['motivated', 'focused', 'neutral', 'struggling', 'tempted'];
        const moodCounts = moods.map(m => 
            Object.values(this.data.moodHistory).filter(v => v === m).length
        );

        this.charts.mood = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Motivated', 'Focused', 'Neutral', 'Struggling', 'Tempted'],
                datasets: [{
                    data: moodCounts,
                    backgroundColor: ['#4ecca3', '#4ecdc4', '#ffd93d', '#ff6b6b', '#7c4dff']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }

    renderProductivityChart() {
        const ctx = document.getElementById('productivityChart');
        if (this.charts.productivity) this.charts.productivity.destroy();

        const hours = Array(24).fill(0);
        // Simulate productivity pattern based on completion times
        Object.values(this.data.days).forEach(day => {
            if (day.timestamp) {
                const hour = new Date(day.timestamp).getHours();
                hours[hour]++;
            }
        });

        this.charts.productivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Completion Times',
                    data: hours,
                    borderColor: '#7c4dff',
                    backgroundColor: 'rgba(124,77,255,0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }

    renderHeatmap() {
        const container = document.getElementById('heatmapContainer');
        const days = 84; // 12 weeks
        let html = '';
        
        for (let i = days - 1; i >= 0; i--) {
            const date = this.getDateString(new Date(Date.now() - i * 86400000));
            const day = this.data.days[date];
            let level = 0;
            
            if (day?.completed) {
                const shieldsActive = Object.values(day.shields).filter(v => v).length;
                level = Math.min(shieldsActive + 1, 5);
            }
            
            html += `<div class="heatmap-day" data-level="${level}" title="${date}"></div>`;
        }
        
        container.innerHTML = html;
    }

    getDateRangeData() {
        const rangeMap = { week: 7, month: 30, year: 365 };
        const days = rangeMap[this.analyticsRange] || 7;
        const labels = [];
        const completions = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = this.getDateString(new Date(Date.now() - i * 86400000));
            labels.push(new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }));
            completions.push(this.data.days[date]?.completed ? 1 : 0);
        }

        return { labels, completions };
    }

    // Community
    generateShareCode() {
        if (!this.settings.shareCode) {
            this.settings.shareCode = this.generateCode();
            this.saveSettings();
        }
        document.getElementById('myShareCode').textContent = this.settings.shareCode;
    }

    openAddPartnerModal() {
        document.getElementById('addPartnerModal').style.display = 'flex';
        document.getElementById('myShareCode').textContent = this.settings.shareCode;
    }

    connectPartner() {
        const code = document.getElementById('partnerCodeInput').value.trim().toUpperCase();
        if (code.length !== 6) {
            this.showToast('Please enter a valid 6-character code', 'warning');
            return;
        }

        // In a real app, this would connect to a server
        // For demo, we'll simulate adding a partner
        if (!this.data.partners.includes(code)) {
            this.data.partners.push(code);
            this.saveData();
            this.showToast('Partner connected! 🤝', 'success');
            this.closeAllModals();
            this.renderCommunity();
        } else {
            this.showToast('Partner already connected', 'info');
        }
    }

    copyShareCode() {
        navigator.clipboard.writeText(this.settings.shareCode).then(() => {
            this.showToast('Share code copied! 📋', 'success');
        });
    }

    renderCommunity() {
        const partnersList = document.getElementById('partnersList');
        
        if (this.data.partners.length === 0) {
            partnersList.innerHTML = `
                <div class="partner-card empty">
                    <span class="empty-icon">🤝</span>
                    <p>No partners yet. Add accountability partners to stay motivated!</p>
                    <button class="btn btn-primary" onclick="app.openAddPartnerModal()">+ Add Partner</button>
                </div>`;
        } else {
            partnersList.innerHTML = this.data.partners.map(code => `
                <div class="partner-card">
                    <span class="empty-icon">👤</span>
                    <strong>Partner ${code}</strong>
                    <p>Connected</p>
                </div>
            `).join('');
        }

        document.getElementById('accountabilityPartners').textContent = this.data.partners.length;
    }

    // Settings
    loadSettingsUI() {
        document.getElementById('themeSelect').value = this.settings.theme;
        document.getElementById('shieldName').value = this.settings.shieldName;
        
        const notif = this.settings.notifications;
        document.getElementById('morningReminder').checked = notif.morning.enabled;
        document.getElementById('morningTime').value = notif.morning.time;
        document.getElementById('middayReminder').checked = notif.midday.enabled;
        document.getElementById('middayTime').value = notif.midday.time;
        document.getElementById('eveningReminder').checked = notif.evening.enabled;
        document.getElementById('eveningTime').value = notif.evening.time;
        document.getElementById('dangerAlert').checked = notif.dangerAlert.enabled;
    }

    updateTheme(theme) {
        this.settings.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        this.saveSettings();
    }

    updateShieldName(name) {
        this.settings.shieldName = name;
        this.saveSettings();
    }

    // Export/Import
    exportAllData() {
        const exportData = {
            data: this.data,
            settings: this.settings,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fikr-shield-backup-${this.currentDate}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Data exported! 📤', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (imported.data && imported.settings) {
                        if (confirm('This will replace all your current data. Continue?')) {
                            this.data = imported.data;
                            this.settings = imported.settings;
                            this.saveData();
                            this.saveSettings();
                            location.reload();
                        }
                    } else {
                        this.showToast('Invalid backup file', 'error');
                    }
                } catch (e) {
                    this.showToast('Error reading file', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    exportAnalyticsReport() {
        const report = {
            generated: new Date().toISOString(),
            totalDays: this.data.totalDays,
            currentStreak: this.data.streak,
            bestStreak: this.data.bestStreak,
            totalHoursSaved: this.data.totalHoursSaved,
            successRate: Object.keys(this.data.days).length > 0 ? 
                ((this.data.totalDays / Object.keys(this.data.days).length) * 100).toFixed(1) + '%' : '0%',
            moodDistribution: this.getMoodDistribution(),
            dailyHistory: this.data.days
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fikr-shield-analytics-${this.currentDate}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Analytics report downloaded! 📊', 'success');
    }

    getMoodDistribution() {
        const distribution = {};
        Object.values(this.data.moodHistory).forEach(mood => {
            distribution[mood] = (distribution[mood] || 0) + 1;
        });
        return distribution;
    }

    resetAllData() {
        if (confirm('⚠️ This will permanently delete all your data, streaks, and history. This cannot be undone. Are you sure?')) {
            if (confirm('Final confirmation: Delete everything?')) {
                localStorage.removeItem('fikrShieldData');
                localStorage.removeItem('fikrShieldSettings');
                location.reload();
            }
        }
    }

    // UI Helpers
    showToast(message, type = 'info') {
        const toast = document.getElementById('achievementToast');
        document.getElementById('achievementMessage').textContent = message;
        
        const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
        document.querySelector('.toast-icon').textContent = icons[type] || 'ℹ️';
        
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    showAchievement(title, icon) {
        document.getElementById('achievementTitle').textContent = title;
        document.querySelector('.toast-icon').textContent = icon;
        document.getElementById('achievementMessage').textContent = 'Congratulations! Keep going!';
        
        const toast = document.getElementById('achievementToast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
        
        this.triggerCelebration();
    }

    triggerCelebration() {
        const colors = ['#4ecca3', '#4ecdc4', '#ffd93d', '#ff6b6b', '#7c4dff'];
        
        for (let i = 0; i < 60; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.cssText = `
                left: ${Math.random() * 100}vw;
                animation-delay: ${Math.random() * 0.5}s;
                animation-duration: ${Math.random() * 2 + 1.5}s;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                width: ${Math.random() * 8 + 6}px;
                height: ${Math.random() * 8 + 6}px;
            `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }

    checkDayChange() {
        setInterval(() => {
            const newDate = this.getDateString();
            if (newDate !== this.currentDate) {
                this.currentDate = newDate;
                this.initializeToday();
                this.updateAllUI();
            }
        }, 60000);
    }

    // Make app globally accessible
    openSettings() {
        this.switchTab('settings');
    }

    closeModal() {
        this.closeAllModals();
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('SW registration failed:', err));
    });
}

// Initialize App
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FikrShield();
    
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', app.settings.theme || 'dark');
});