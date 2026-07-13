/* ============================================
   FIKR SHIELD - Complete Fixed Application Logic
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
        console.log('Fikr Shield initializing...');
        
        // Hide splash screen after load
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            const app = document.getElementById('appContainer');
            if (splash) splash.classList.add('hide');
            if (app) app.style.display = 'block';
        }, 1500);

        this.initializeTabs();
        this.initializeToday();
        this.setupEventListeners();
        this.updateAllUI();
        this.initializeNotifications();
        this.checkDayChange();
        this.generateShareCode();
        
        console.log('Fikr Shield initialized successfully');
    }

    // ==================== DATA MANAGEMENT ====================
    
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
            console.error('Error loading data:', e);
            return defaultData;
        }
    }

    saveData() {
        try {
            localStorage.setItem('fikrShieldData', JSON.stringify(this.data));
        } catch (e) {
            console.error('Error saving data:', e);
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
            console.error('Error loading settings:', e);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('fikrShieldSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }

    generateCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // ==================== TAB NAVIGATION ====================
    
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
        
        const navBtn = document.querySelector(`[data-tab="${tab}"]`);
        const tabContent = document.getElementById(`${tab}Tab`);
        
        if (navBtn) navBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');

        if (tab === 'analytics') this.renderAnalytics();
        if (tab === 'community') this.renderCommunity();
        if (tab === 'settings') this.loadSettingsUI();
    }

    // ==================== TODAY'S DATA ====================
    
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
            if (btn) {
                btn.classList.add('completed');
                const btnText = btn.querySelector('.button-text');
                if (btnText) btnText.textContent = '🛡️ Shield Active - Day Complete!';
            }
            const card = document.getElementById('commitmentCard');
            if (card) card.classList.add('completed');
        }

        // Load shields
        const shields = ['mindlessScrolling', 'socialMedia', 'entertainment', 'adultContent'];
        shields.forEach((shield, i) => {
            const checkbox = document.getElementById(`shield${i + 1}`);
            if (checkbox) checkbox.checked = today.shields[shield];
        });

        // Load mood
        if (today.mood) {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            const moodBtn = document.querySelector(`[data-mood="${today.mood}"]`);
            if (moodBtn) moodBtn.classList.add('active');
        }

        // Load journal
        const journalEntry = document.getElementById('journalEntry');
        if (journalEntry && today.journal) {
            journalEntry.value = today.journal;
            const charCount = document.getElementById('charCount');
            if (charCount) charCount.textContent = today.journal.length;
        }

        this.updateProgress();
        this.updateTimeSaved();
    }

    // ==================== EVENT LISTENERS ====================
    
    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Commitment button
        const commitBtn = document.getElementById('commitButton');
        if (commitBtn) {
            commitBtn.addEventListener('click', () => this.completeCommitment());
        }

        // Bedtime buttons
        const bedtimeConfirm = document.getElementById('bedtimeConfirm');
        const bedtimeReflect = document.getElementById('bedtimeReflect');
        if (bedtimeConfirm) bedtimeConfirm.addEventListener('click', () => this.bedtimeCheckin(true));
        if (bedtimeReflect) bedtimeReflect.addEventListener('click', () => this.bedtimeCheckin(false));

        // Shield checkboxes
        for (let i = 1; i <= 4; i++) {
            const shield = document.getElementById(`shield${i}`);
            if (shield) {
                shield.addEventListener('change', (e) => {
                    this.updateShield(i - 1, e.target.checked);
                });
            }
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
        if (journalEntry) {
            journalEntry.addEventListener('input', () => {
                const charCount = document.getElementById('charCount');
                if (charCount) charCount.textContent = journalEntry.value.length;
            });
        }
        const saveJournalBtn = document.getElementById('saveJournalBtn');
        if (saveJournalBtn) saveJournalBtn.addEventListener('click', () => this.saveJournal());

        // Edit reminder button
        const editReminderBtn = document.getElementById('editReminderBtn');
        if (editReminderBtn) {
            editReminderBtn.addEventListener('click', () => this.switchTab('settings'));
        }

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
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => this.updateTheme(e.target.value));
        }
        
        const shieldNameInput = document.getElementById('shieldName');
        if (shieldNameInput) {
            shieldNameInput.addEventListener('change', (e) => this.updateShieldName(e.target.value));
        }
        
        // Notification settings
        ['morning', 'midday', 'evening'].forEach(type => {
            const reminderCheck = document.getElementById(`${type}Reminder`);
            const timeInput = document.getElementById(`${type}Time`);
            
            if (reminderCheck) {
                reminderCheck.addEventListener('change', (e) => {
                    this.settings.notifications[type].enabled = e.target.checked;
                    this.saveSettings();
                    this.scheduleNotifications();
                });
            }
            if (timeInput) {
                timeInput.addEventListener('change', (e) => {
                    this.settings.notifications[type].time = e.target.value;
                    this.saveSettings();
                    this.scheduleNotifications();
                });
            }
        });

        const dangerAlert = document.getElementById('dangerAlert');
        if (dangerAlert) {
            dangerAlert.addEventListener('change', (e) => {
                this.settings.notifications.dangerAlert.enabled = e.target.checked;
                this.saveSettings();
            });
        }

        // Export/Import/Reset
        const exportDataBtn = document.getElementById('exportDataBtn');
        const importDataBtn = document.getElementById('importDataBtn');
        const resetDataBtn = document.getElementById('resetDataBtn');
        const exportAnalyticsBtn = document.getElementById('exportAnalyticsBtn');
        
        if (exportDataBtn) exportDataBtn.addEventListener('click', () => this.exportAllData());
        if (importDataBtn) importDataBtn.addEventListener('click', () => this.importData());
        if (resetDataBtn) resetDataBtn.addEventListener('click', () => this.resetAllData());
        if (exportAnalyticsBtn) exportAnalyticsBtn.addEventListener('click', () => this.exportAnalyticsReport());

        // Community buttons
        const addPartnerBtn = document.getElementById('addPartnerBtn');
        const connectPartnerBtn = document.getElementById('connectPartnerBtn');
        const copyCodeBtn = document.getElementById('copyCodeBtn');
        const closePartnerModal = document.getElementById('closePartnerModal');
        
        if (addPartnerBtn) addPartnerBtn.addEventListener('click', () => this.openAddPartnerModal());
        if (connectPartnerBtn) connectPartnerBtn.addEventListener('click', () => this.connectPartner());
        if (copyCodeBtn) copyCodeBtn.addEventListener('click', () => this.copyShareCode());
        if (closePartnerModal) closePartnerModal.addEventListener('click', () => this.closeAllModals());

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        console.log('Event listeners setup complete');
    }

    // ==================== COMMITMENT LOGIC ====================
    
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
        const journalEntry = document.getElementById('journalEntry');
        if (!journalEntry) return;
        
        const journal = journalEntry.value;
        this.data.days[this.currentDate].journal = journal;
        this.data.journalEntries[this.currentDate] = journal;
        this.saveData();
        this.showToast('Reflection saved! 📝', 'success');
    }

    // ==================== UI UPDATES ====================
    
    updateAllUI() {
        this.updateStreakDisplay();
        this.updateTimeSaved();
        this.updateProgress();
        this.updateReminderStatus();
        this.setDailyQuote();
    }

    updateStreakDisplay() {
        const streakCount = document.getElementById('streakCount');
        const totalHoursSaved = document.getElementById('totalHoursSaved');
        const accountabilityPartners = document.getElementById('accountabilityPartners');
        
        if (streakCount) streakCount.textContent = this.data.streak;
        if (totalHoursSaved) totalHoursSaved.textContent = Math.round(this.data.totalHoursSaved);
        if (accountabilityPartners) accountabilityPartners.textContent = this.data.partners.length;
    }

    updateProgress() {
        const today = this.data.days[this.currentDate];
        const shields = Object.values(today.shields);
        const activeShields = shields.filter(v => v).length;
        const progress = shields.length > 0 ? (activeShields / shields.length) * 100 : 0;

        const progressText = document.getElementById('progressText');
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
        
        // Update progress ring
        const progressRing = document.getElementById('progressRing');
        if (progressRing) {
            const circumference = 565.48;
            const offset = circumference - (progress / 100) * circumference;
            progressRing.style.strokeDashoffset = offset;
        }
    }

    updateTimeSaved() {
        const today = this.data.days[this.currentDate];
        const timeSavedToday = document.getElementById('timeSavedToday');
        if (timeSavedToday) {
            timeSavedToday.textContent = `${today.hoursSaved || 0} hours`;
        }
    }

    updateReminderStatus() {
        const evening = this.settings.notifications.evening;
        const statusText = document.getElementById('reminderStatusText');
        const reminderDot = document.querySelector('.reminder-dot');
        
        if (statusText) {
            if (evening.enabled) {
                statusText.textContent = `Evening reminder set for ${this.formatTime(evening.time)}`;
            } else {
                statusText.textContent = 'No reminders set';
            }
        }
        if (reminderDot) {
            if (evening.enabled) {
                reminderDot.classList.add('active');
            } else {
                reminderDot.classList.remove('active');
            }
        }
    }

    formatTime(time) {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
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
        const dailyQuote = document.getElementById('dailyQuote');
        const quoteAuthor = document.getElementById('quoteAuthor');
        
        if (dailyQuote) dailyQuote.textContent = quote.text;
        if (quoteAuthor) quoteAuthor.textContent = `- ${quote.author}`;
    }

    // ==================== NOTIFICATIONS ====================
    
    initializeNotifications() {
        console.log('Initializing notifications...');
        
        if (!('Notification' in window)) {
            console.log('Notifications not supported in this browser');
            return;
        }

        console.log('Notification permission status:', Notification.permission);

        if (Notification.permission === 'default') {
            // Show modal after app loads
            setTimeout(() => {
                const modal = document.getElementById('notificationModal');
                const enableBtn = document.getElementById('enableNotificationsBtn');
                const skipBtn = document.getElementById('skipNotificationsBtn');
                
                console.log('Modal elements found:', { modal: !!modal, enableBtn: !!enableBtn, skipBtn: !!skipBtn });
                
                if (modal && enableBtn && skipBtn) {
                    // Show modal
                    modal.style.display = 'flex';
                    console.log('Notification modal displayed');
                    
                    // Enable button click
                    enableBtn.onclick = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Enable notifications button clicked');
                        
                        try {
                            const permission = await Notification.requestPermission();
                            console.log('Permission result:', permission);
                            
                            if (permission === 'granted') {
                                this.scheduleNotifications();
                                this.showToast('Notifications enabled! 🔔', 'success');
                            } else {
                                this.showToast('Notifications skipped. You can enable them in Settings.', 'info');
                            }
                            modal.style.display = 'none';
                        } catch (error) {
                            console.error('Error requesting notification permission:', error);
                            modal.style.display = 'none';
                        }
                    };
                    
                    // Skip button click
                    skipBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Skip notifications button clicked');
                        modal.style.display = 'none';
                    };
                    
                } else {
                    console.error('Notification modal elements not found!');
                }
            }, 2000);
            
        } else if (Notification.permission === 'granted') {
            console.log('Notifications already granted');
            this.scheduleNotifications();
        } else if (Notification.permission === 'denied') {
            console.log('Notifications denied by user');
        }
    }

    scheduleNotifications() {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            console.log('Cannot schedule notifications - permission not granted');
            return;
        }

        console.log('Scheduling notifications...');

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
        
        console.log(`Scheduling "${id}" notification in ${Math.round(delay / 60000)} minutes`);
        
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                try {
                    new Notification(message.title, {
                        body: message.body,
                        icon: '/fikr-sheild/icons/icon-192.png',
                        badge: '/fikr-sheild/icons/icon-72.png',
                        tag: id,
                        requireInteraction: id === 'evening' || id === 'danger'
                    });
                    console.log(`Notification sent: ${message.title}`);
                } catch (e) {
                    console.error('Error sending notification:', e);
                }
            }
            // Reschedule for next day
            this.scheduleDailyNotification(id, time, message);
        }, delay);
    }

    // ==================== ANALYTICS ====================
    
    renderAnalytics() {
        this.updateAnalyticsOverview();
        this.renderStreakChart();
        this.renderTimeWastersChart();
        this.renderMoodChart();
        this.renderProductivityChart();
        this.renderHeatmap();
    }

    updateAnalyticsOverview() {
        const totalDays = document.getElementById('analyticsTotalDays');
        const bestStreak = document.getElementById('analyticsBestStreak');
        const successRate = document.getElementById('analyticsSuccessRate');
        const totalHours = document.getElementById('analyticsTotalHours');
        
        if (totalDays) totalDays.textContent = this.data.totalDays;
        if (bestStreak) bestStreak.textContent = this.data.bestStreak;
        
        const totalPossible = Object.keys(this.data.days).length;
        const rate = totalPossible > 0 ? ((this.data.totalDays / totalPossible) * 100).toFixed(1) : 0;
        if (successRate) successRate.textContent = `${rate}%`;
        if (totalHours) totalHours.textContent = Math.round(this.data.totalHoursSaved);
    }

    renderStreakChart() {
        const ctx = document.getElementById('streakChart');
        if (!ctx) return;
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
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        max: 1, 
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }

    renderTimeWastersChart() {
        const ctx = document.getElementById('timeWastersChart');
        if (!ctx) return;
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
                    backgroundColor: ['#4ecca3', '#4ecdc4', '#ffd93d', '#ff6b6b'],
                    borderColor: 'transparent'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { color: '#9fa8da', padding: 15 } 
                    }
                }
            }
        });
    }

    renderMoodChart() {
        const ctx = document.getElementById('moodChart');
        if (!ctx) return;
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
                    backgroundColor: ['#4ecca3', '#4ecdc4', '#ffd93d', '#ff6b6b', '#7c4dff'],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    renderProductivityChart() {
        const ctx = document.getElementById('productivityChart');
        if (!ctx) return;
        if (this.charts.productivity) this.charts.productivity.destroy();

        const hours = Array(24).fill(0);
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
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#7c4dff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }

    renderHeatmap() {
        const container = document.getElementById('heatmapContainer');
        if (!container) return;
        
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
            
            html += `<div class="heatmap-day" data-level="${level}" title="${date}: ${level > 0 ? 'Shields: ' + level : 'No activity'}"></div>`;
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

    // ==================== COMMUNITY ====================
    
    generateShareCode() {
        if (!this.settings.shareCode) {
            this.settings.shareCode = this.generateCode();
            this.saveSettings();
        }
        const myShareCode = document.getElementById('myShareCode');
        if (myShareCode) myShareCode.textContent = this.settings.shareCode;
    }

    openAddPartnerModal() {
        const modal = document.getElementById('addPartnerModal');
        const myShareCode = document.getElementById('myShareCode');
        
        if (modal) modal.style.display = 'flex';
        if (myShareCode) myShareCode.textContent = this.settings.shareCode;
    }

    connectPartner() {
        const input = document.getElementById('partnerCodeInput');
        if (!input) return;
        
        const code = input.value.trim().toUpperCase();
        if (code.length !== 6) {
            this.showToast('Please enter a valid 6-character code', 'warning');
            return;
        }

        if (!this.data.partners.includes(code)) {
            this.data.partners.push(code);
            this.saveData();
            this.showToast('Partner connected! 🤝', 'success');
            this.closeAllModals();
            this.renderCommunity();
            input.value = '';
        } else {
            this.showToast('Partner already connected', 'info');
        }
    }

    copyShareCode() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(this.settings.shareCode).then(() => {
                this.showToast('Share code copied! 📋', 'success');
            }).catch(() => {
                this.showToast('Failed to copy. Your code: ' + this.settings.shareCode, 'info');
            });
        } else {
            this.showToast('Your code: ' + this.settings.shareCode, 'info');
        }
    }

    renderCommunity() {
        const partnersList = document.getElementById('partnersList');
        if (!partnersList) return;
        
        if (this.data.partners.length === 0) {
            partnersList.innerHTML = `
                <div class="partner-card empty">
                    <span class="empty-icon">🤝</span>
                    <p>No partners yet. Add accountability partners to stay motivated!</p>
                    <button class="btn btn-primary" id="addPartnerBtn">+ Add Partner</button>
                </div>`;
            // Re-attach event listener
            const btn = document.getElementById('addPartnerBtn');
            if (btn) btn.addEventListener('click', () => this.openAddPartnerModal());
        } else {
            partnersList.innerHTML = this.data.partners.map(code => `
                <div class="partner-card" style="border-style: solid; border-color: rgba(78,204,163,0.3);">
                    <span class="empty-icon">👤</span>
                    <strong style="color: var(--text-primary);">Partner ${code}</strong>
                    <p style="color: var(--accent-primary);">Connected ✅</p>
                </div>
            `).join('');
        }

        const accountabilityPartners = document.getElementById('accountabilityPartners');
        if (accountabilityPartners) accountabilityPartners.textContent = this.data.partners.length;

        // Update challenge status
        const challengeStatus = document.getElementById('challengeStatus');
        const challengeProgress = document.querySelector('.challenge-progress-fill');
        if (challengeStatus) {
            challengeStatus.textContent = `Day ${this.data.streak} of 7`;
        }
        if (challengeProgress) {
            const progressPercent = Math.min((this.data.streak / 7) * 100, 100);
            challengeProgress.style.width = `${progressPercent}%`;
        }
    }

    // ==================== SETTINGS ====================
    
    loadSettingsUI() {
        const themeSelect = document.getElementById('themeSelect');
        const shieldNameInput = document.getElementById('shieldName');
        
        if (themeSelect) themeSelect.value = this.settings.theme;
        if (shieldNameInput) shieldNameInput.value = this.settings.shieldName;
        
        const notif = this.settings.notifications;
        
        const morningReminder = document.getElementById('morningReminder');
        const morningTime = document.getElementById('morningTime');
        const middayReminder = document.getElementById('middayReminder');
        const middayTime = document.getElementById('middayTime');
        const eveningReminder = document.getElementById('eveningReminder');
        const eveningTime = document.getElementById('eveningTime');
        const dangerAlert = document.getElementById('dangerAlert');
        
        if (morningReminder) morningReminder.checked = notif.morning.enabled;
        if (morningTime) morningTime.value = notif.morning.time;
        if (middayReminder) middayReminder.checked = notif.midday.enabled;
        if (middayTime) middayTime.value = notif.midday.time;
        if (eveningReminder) eveningReminder.checked = notif.evening.enabled;
        if (eveningTime) eveningTime.value = notif.evening.time;
        if (dangerAlert) dangerAlert.checked = notif.dangerAlert.enabled;
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

    // ==================== EXPORT/IMPORT ====================
    
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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('Data exported! 📤', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
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
                            this.showToast('Data imported successfully! Reloading...', 'success');
                            setTimeout(() => location.reload(), 1500);
                        }
                    } else {
                        this.showToast('Invalid backup file', 'error');
                    }
                } catch (e) {
                    console.error('Import error:', e);
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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
                this.showToast('All data reset. Reloading...', 'info');
                setTimeout(() => location.reload(), 1500);
            }
        }
    }

    // ==================== UI HELPERS ====================
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('achievementToast');
        if (!toast) return;
        
        const messageEl = document.getElementById('achievementMessage');
        const titleEl = document.getElementById('achievementTitle');
        const iconEl = toast.querySelector('.toast-icon');
        
        const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
        
        if (iconEl) iconEl.textContent = icons[type] || 'ℹ️';
        if (titleEl) titleEl.textContent = type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Notice';
        if (messageEl) messageEl.textContent = message;
        
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    showAchievement(title, icon) {
        const toast = document.getElementById('achievementToast');
        if (!toast) return;
        
        const titleEl = document.getElementById('achievementTitle');
        const messageEl = document.getElementById('achievementMessage');
        const iconEl = toast.querySelector('.toast-icon');
        
        if (titleEl) titleEl.textContent = title;
        if (iconEl) iconEl.textContent = icon;
        if (messageEl) messageEl.textContent = 'Congratulations! Keep going!';
        
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
        
        this.triggerCelebration();
    }

    triggerCelebration() {
        const colors = ['#4ecca3', '#4ecdc4', '#ffd93d', '#ff6b6b', '#7c4dff'];
        
        for (let i = 0; i < 60; i++) {
            setTimeout(() => {
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
            }, i * 20);
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    checkDayChange() {
        setInterval(() => {
            const newDate = this.getDateString();
            if (newDate !== this.currentDate) {
                console.log('New day detected! Resetting...');
                this.currentDate = newDate;
                this.initializeToday();
                this.updateAllUI();
            }
        }, 60000);
    }

    // Make methods accessible globally
    openSettings() {
        this.switchTab('settings');
    }

    closeModal() {
        this.closeAllModals();
    }
}

// ==================== SERVICE WORKER ====================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully:', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// ==================== INITIALIZE APP ====================

let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating FikrShield instance...');
    app = new FikrShield();
    
    // Apply saved theme
    const savedSettings = app.settings;
    if (savedSettings && savedSettings.theme) {
        document.documentElement.setAttribute('data-theme', savedSettings.theme);
    }
    
    // Expose app globally for onclick handlers
    window.app = app;
    
    console.log('Fikr Shield app is ready! 🛡️');
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
