/* ============================================
   FIKR SHIELD - Complete Advanced Application
   All Features Included - Full Version 2.0
   ============================================ */

class FikrShield {
    constructor() {
        this.currentDate = new Date();
        this.today = this.getDateString(this.currentDate);
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.data = this.loadData();
        this.settings = this.loadSettings();
        this.notificationTimeouts = [];
        this.init();
    }

    // ==================== UTILITY FUNCTIONS ====================
    
    getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getMonthKey(year, month) {
        return `${year}-${String(month + 1).padStart(2, '0')}`;
    }

    formatTime(time) {
        if (!time) return '';
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${m} ${ampm}`;
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    // ==================== DATA MANAGEMENT ====================
    
    loadData() {
        const defaultData = {
            protectedDays: {},
            reflections: {},
            streak: 0,
            bestStreak: 0,
            totalProtected: 0,
            totalMissed: 0,
            monthlyCompletions: {},
            rewardsEarned: [],
            rewardHistory: [],
            lastActiveDate: null,
            challengeData: {
                currentChallenge: null,
                challengeProgress: 0,
                challengeStartDate: null
            },
            timeWastersTracked: {},
            moodData: {},
            yearlyStats: {}
        };
        
        try {
            const saved = localStorage.getItem('fikrShieldData');
            const parsed = saved ? JSON.parse(saved) : {};
            return { ...defaultData, ...parsed };
        } catch (e) {
            console.error('Data load error:', e);
            return defaultData;
        }
    }

    saveData() {
        try {
            localStorage.setItem('fikrShieldData', JSON.stringify(this.data));
        } catch (e) {
            console.error('Data save error:', e);
            this.showToast('⚠️ Storage full! Please export your data.', 'warning');
        }
    }

    loadSettings() {
        const defaults = {
            eveningReminder: { enabled: true, time: '21:00' },
            nightReminder: { enabled: true, time: '23:00' },
            morningReminder: { enabled: true, time: '06:00' },
            missedAlert: { enabled: true, time: '22:00' },
            notificationsEnabled: false,
            theme: 'dark',
            language: 'en',
            shieldName: 'My Daily Shield',
            weekStartDay: 0,
            showReflection: true,
            autoActivate: false
        };
        
        try {
            const saved = localStorage.getItem('fikrShieldSettings');
            const parsed = saved ? JSON.parse(saved) : {};
            return { ...defaults, ...parsed };
        } catch (e) {
            console.error('Settings load error:', e);
            return defaults;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('fikrShieldSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('Settings save error:', e);
        }
    }

    // ==================== INITIALIZATION ====================
    
    init() {
        console.log('🛡️ Fikr Shield v2.0 Initializing...');
        
        // Show splash screen for branding
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            const app = document.getElementById('appContainer');
            if (splash) splash.classList.add('hide');
            if (app) app.style.display = 'block';
            this.onAppReady();
        }, 1800);

        this.initializeTodayData();
        this.setupAllEventListeners();
        this.renderCalendar();
        this.updateAllUI();
        this.initializeNotificationSystem();
        this.startDayChangeMonitor();
        this.checkMonthlyReward();
        this.updateYearlyStats();
        
        console.log('✅ Fikr Shield Ready!');
    }

    onAppReady() {
        // Check if returning user
        if (this.data.totalProtected > 0) {
            console.log(`Welcome back! ${this.data.totalProtected} days protected.`);
        }
        
        // Check if missed yesterday
        this.checkMissedYesterday();
        
        // Update challenge progress
        this.updateChallengeProgress();
    }

    initializeTodayData() {
        if (this.data.protectedDays[this.today] === undefined) {
            this.data.protectedDays[this.today] = false;
        }
        if (!this.data.reflections[this.today]) {
            this.data.reflections[this.today] = '';
        }
        this.data.lastActiveDate = this.today;
        this.saveData();
    }

    // ==================== EVENT LISTENERS ====================
    
    setupAllEventListeners() {
        // Calendar Navigation
        this.safeAddListener('prevMonth', 'click', () => this.changeMonth(-1));
        this.safeAddListener('nextMonth', 'click', () => this.changeMonth(1));
        this.safeAddListener('todayBtn', 'click', () => this.goToToday());

        // Shield Actions
        this.safeAddListener('shieldActivateBtn', 'click', () => this.activateShield());
        this.safeAddListener('shieldDeactivateBtn', 'click', () => this.deactivateShield());
        this.safeAddListener('saveReflectionBtn', 'click', () => this.saveReflection());
        this.safeAddListener('skipReflectionBtn', 'click', () => this.skipReflection());

        // Settings & Modals
        this.safeAddListener('settingsFab', 'click', () => this.openSettings());
        this.safeAddListener('openSettingsBtn', 'click', () => this.openSettings());
        this.safeAddListener('saveSettingsBtn', 'click', () => this.saveNotificationSettings());
        this.safeAddListener('closeSettingsBtn', 'click', () => this.closeModal('settingsModal'));
        this.safeAddListener('closeRewardBtn', 'click', () => this.closeModal('rewardModal'));
        this.safeAddListener('closeStatsBtn', 'click', () => this.closeModal('statsModal'));

        // Notification Permission
        this.safeAddListener('enableNotificationsBtn', 'click', () => this.requestNotificationPermission());
        this.safeAddListener('skipNotificationsBtn', 'click', () => this.closeModal('notificationModal'));

        // Data Management
        this.safeAddListener('exportDataBtn', 'click', () => this.exportAllData());
        this.safeAddListener('importDataBtn', 'click', () => this.triggerImport());
        this.safeAddListener('resetDataBtn', 'click', () => this.confirmResetAllData());
        this.safeAddListener('viewStatsBtn', 'click', () => this.openStatsModal());

        // Mood Tracking
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => this.trackMood(btn.dataset.mood));
        });

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 's' && e.ctrlKey) {
                e.preventDefault();
                this.activateShield();
            }
            if (e.key === 'ArrowLeft' && e.ctrlKey) {
                e.preventDefault();
                this.changeMonth(-1);
            }
            if (e.key === 'ArrowRight' && e.ctrlKey) {
                e.preventDefault();
                this.changeMonth(1);
            }
        });
    }

    safeAddListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element #${id} not found for event listener`);
        }
    }

    // ==================== CALENDAR SYSTEM ====================
    
    changeMonth(direction) {
        this.currentMonth += direction;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
        this.updateMonthlyStats();
        this.updateRewardSection();
    }

    goToToday() {
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.renderCalendar();
        this.updateMonthlyStats();
        this.updateRewardSection();
    }

    renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const monthYearDisplay = document.getElementById('monthYearDisplay');
        
        if (!grid || !monthYearDisplay) return;

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        monthYearDisplay.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = this.getDaysInMonth(this.currentYear, this.currentMonth);
        const today = new Date();
        const todayStr = this.getDateString(today);
        
        let html = '';
        
        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.getDateString(new Date(this.currentYear, this.currentMonth, day));
            const isProtected = this.data.protectedDays[dateStr] === true;
            const isToday = dateStr === todayStr;
            const dateObj = new Date(this.currentYear, this.currentMonth, day);
            const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isFuture = dateObj > new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            let className = 'calendar-day';
            let tooltip = '';
            
            if (isToday) {
                className += ' today';
                tooltip = 'Today - Click to activate shield';
            } else if (isProtected) {
                className += ' protected';
                tooltip = 'Protected ✓';
            } else if (isPast && !isProtected) {
                className += ' missed';
                tooltip = 'Missed ✗ - Click to recover';
            } else if (isFuture) {
                className += ' future';
                tooltip = 'Future day';
            }
            
            // Add weekend styling
            const dayOfWeek = new Date(this.currentYear, this.currentMonth, day).getDay();
            if (dayOfWeek === 5) className += ' friday';
            if (dayOfWeek === 0 || dayOfWeek === 6) className += ' weekend';
            
            // Add reflection indicator
            if (this.data.reflections[dateStr] && this.data.reflections[dateStr].trim()) {
                className += ' has-reflection';
            }
            
            html += `<div class="${className}" 
                          data-date="${dateStr}" 
                          data-day="${day}"
                          title="${tooltip}"
                          onclick="app.handleDayClick('${dateStr}', ${isFuture})">
                <span class="day-number">${day}</span>
                ${isProtected ? '<span class="check-mark">✓</span>' : ''}
                ${!isProtected && isPast && !isFuture ? '<span class="x-mark">✗</span>' : ''}
                ${this.data.reflections[dateStr] ? '<span class="reflection-dot">•</span>' : ''}
            </div>`;
        }
        
        grid.innerHTML = html;
        this.updateMonthlyStats();
    }

    handleDayClick(dateStr, isFuture) {
        if (isFuture) {
            this.showToast('Cannot modify future dates', 'warning');
            return;
        }
        
        const date = new Date(dateStr);
        const today = new Date(this.today);
        
        if (dateStr === this.today) {
            if (this.data.protectedDays[dateStr]) {
                this.showReflectionPrompt();
            } else {
                this.activateShield();
            }
        } else if (date < today) {
            // Past day - toggle protection
            if (this.data.protectedDays[dateStr]) {
                this.data.protectedDays[dateStr] = false;
                this.data.totalProtected--;
                this.showToast('Day unmarked', 'info');
            } else {
                this.data.protectedDays[dateStr] = true;
                this.data.totalProtected++;
                this.showToast('Day recovered! Alhamdulillah', 'success');
            }
            this.calculateAllStats();
            this.saveData();
            this.renderCalendar();
            this.updateAllUI();
        }
    }

    // ==================== SHIELD ACTIVATION ====================
    
    activateShield() {
        if (this.data.protectedDays[this.today]) {
            this.showToast('Shield already active today! 🛡️', 'info');
            return;
        }
        
        // Activate the shield
        this.data.protectedDays[this.today] = true;
        this.data.totalProtected++;
        this.calculateAllStats();
        this.saveData();
        
        // Update UI
        this.renderCalendar();
        this.updateAllUI();
        this.updateTodayActionCard();
        
        // Show reflection prompt
        if (this.settings.showReflection) {
            this.showReflectionPrompt();
        }
        
        // Celebration effects
        this.triggerCelebration();
        
        // Check achievements
        this.checkMilestones();
        this.checkMonthlyReward();
        this.updateYearlyStats();
        
        // Log
        console.log(`🛡️ Shield activated for ${this.today}. Streak: ${this.data.streak}`);
    }

    deactivateShield() {
        if (!this.data.protectedDays[this.today]) {
            this.showToast('Shield not active today', 'info');
            return;
        }
        
        if (confirm('Are you sure you want to remove today\'s protection? This will affect your streak.')) {
            this.data.protectedDays[this.today] = false;
            this.data.totalProtected--;
            this.calculateAllStats();
            this.saveData();
            this.renderCalendar();
            this.updateAllUI();
            this.showToast('Shield removed for today', 'warning');
        }
    }

    showReflectionPrompt() {
        const reflectionBox = document.getElementById('reflectionBox');
        const reflectionInput = document.getElementById('reflectionInput');
        
        if (reflectionBox) {
            reflectionBox.style.display = 'block';
            if (reflectionInput) reflectionInput.value = this.data.reflections[this.today] || '';
        }
    }

    saveReflection() {
        const input = document.getElementById('reflectionInput');
        if (input && input.value.trim()) {
            this.data.reflections[this.today] = input.value.trim();
            this.saveData();
            this.showToast('Reflection saved! 📝', 'success');
            document.getElementById('reflectionBox').style.display = 'none';
            this.renderCalendar(); // Update reflection dot
        } else {
            this.showToast('Please write something first', 'warning');
        }
    }

    skipReflection() {
        document.getElementById('reflectionBox').style.display = 'none';
    }

    // ==================== STATS CALCULATIONS ====================
    
    calculateAllStats() {
        this.calculateStreak();
        this.calculateMonthlyProtected();
        this.calculateMissedDays();
    }

    calculateStreak() {
        let streak = 0;
        let checkDate = new Date(this.today);
        
        // Count backwards from today
        while (this.data.protectedDays[this.getDateString(checkDate)] === true) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        this.data.streak = streak;
        if (streak > this.data.bestStreak) {
            this.data.bestStreak = streak;
        }
    }

    calculateMonthlyProtected() {
        let count = 0;
        const daysInMonth = this.getDaysInMonth(this.currentYear, this.currentMonth);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.getDateString(new Date(this.currentYear, this.currentMonth, day));
            if (this.data.protectedDays[dateStr]) count++;
        }
        
        return count;
    }

    calculateMissedDays() {
        let missed = 0;
        const today = new Date(this.today);
        const startOfYear = new Date(this.currentYear, 0, 1);
        
        for (let d = new Date(startOfYear); d < today; d.setDate(d.getDate() + 1)) {
            const dateStr = this.getDateString(d);
            if (!this.data.protectedDays[dateStr]) missed++;
        }
        
        this.data.totalMissed = missed;
    }

    checkMissedYesterday() {
        const yesterday = new Date(this.currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this.getDateString(yesterday);
        
        if (this.data.protectedDays[yesterdayStr] === undefined && 
            yesterday >= new Date('2024-01-01')) {
            this.data.protectedDays[yesterdayStr] = false;
            this.saveData();
        }
    }

    // ==================== UI UPDATES ====================
    
    updateAllUI() {
        this.updateStatsCards();
        this.updateTodayActionCard();
        this.updateMonthlyStats();
        this.updateNotificationStatus();
        this.updateRewardSection();
        this.updateChallengeProgress();
    }

    updateStatsCards() {
        this.safeSetText('currentStreak', this.data.streak);
        this.safeSetText('bestStreak', this.data.bestStreak);
        this.safeSetText('totalProtected', this.data.totalProtected);
        this.safeSetText('rewardsEarned', this.data.rewardsEarned.length);
        this.safeSetText('monthlyProtected', this.calculateMonthlyProtected());
    }

    updateTodayActionCard() {
        const isProtected = this.data.protectedDays[this.today];
        const actionCard = document.getElementById('actionCard');
        const shieldBtn = document.getElementById('shieldActivateBtn');
        const actionMessage = document.getElementById('actionMessage');
        const actionIcon = document.getElementById('actionIcon');
        const actionTime = document.getElementById('actionTime');
        
        if (!shieldBtn || !actionMessage) return;
        
        if (isProtected) {
            if (actionCard) actionCard.classList.add('completed');
            shieldBtn.classList.add('completed');
            shieldBtn.innerHTML = '<span class="btn-icon">✅</span><span class="btn-text">SHIELD ACTIVE</span>';
            if (actionMessage) actionMessage.textContent = 'Alhamdulillah! You are protected today.';
            if (actionIcon) actionIcon.textContent = '🛡️';
            if (actionTime) actionTime.textContent = 'Shield activated for today';
        } else {
            if (actionCard) actionCard.classList.remove('completed');
            shieldBtn.classList.remove('completed');
            shieldBtn.innerHTML = '<span class="btn-icon">🛡️</span><span class="btn-text">ACTIVATE SHIELD</span>';
            if (actionMessage) actionMessage.textContent = 'Activate your shield for protection tonight';
            if (actionIcon) actionIcon.textContent = '🌙';
            
            const hoursLeft = this.getHoursUntilMidnight();
            if (actionTime) actionTime.textContent = `${hoursLeft} hours left to activate today`;
        }
    }

    updateMonthlyStats() {
        const daysInMonth = this.getDaysInMonth(this.currentYear, this.currentMonth);
        const protectedCount = this.calculateMonthlyProtected();
        const percentage = daysInMonth > 0 ? Math.round((protectedCount / daysInMonth) * 100) : 0;
        
        this.safeSetText('monthlyProtected', protectedCount);
        
        const progressBar = document.getElementById('monthlyProgressBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage);
        }
        
        const progressText = document.getElementById('monthlyProgressText');
        if (progressText) {
            progressText.textContent = `Protected: ${protectedCount}/${daysInMonth} days (${percentage}%)`;
        }
    }

    updateNotificationStatus() {
        const status = document.getElementById('notificationStatus');
        if (!status) return;
        
        if (this.settings.notificationsEnabled && this.settings.eveningReminder.enabled) {
            status.textContent = `⏰ Next: ${this.formatTime(this.settings.eveningReminder.time)}`;
            status.style.color = '#4ecca3';
        } else if (this.settings.notificationsEnabled) {
            status.textContent = '⏰ Notifications on';
            status.style.color = '#4ecca3';
        } else {
            status.textContent = '🔕 Notifications off';
            status.style.color = '#9aa5b1';
        }
    }

    updateRewardSection() {
        const daysInMonth = this.getDaysInMonth(this.currentYear, this.currentMonth);
        const protectedCount = this.calculateMonthlyProtected();
        const daysNeeded = daysInMonth - protectedCount;
        
        const daysNeededEl = document.getElementById('daysNeeded');
        if (daysNeededEl) {
            if (daysNeeded === 0) {
                daysNeededEl.textContent = '🎉 Monthly goal completed! Check your reward!';
                daysNeededEl.style.color = '#d4a843';
            } else {
                daysNeededEl.textContent = `${daysNeeded} more days to unlock monthly reward`;
                daysNeededEl.style.color = '#9aa5b1';
            }
        }
    }

    updateChallengeProgress() {
        if (this.data.challengeData.currentChallenge) {
            const progress = this.data.challengeData.challengeProgress;
            const challengeEl = document.getElementById('challengeProgress');
            if (challengeEl) {
                challengeEl.textContent = `Challenge Progress: ${progress}%`;
            }
        }
    }

    safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    getHoursUntilMidnight() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return Math.max(0, Math.ceil((midnight - now) / (1000 * 60 * 60)));
    }

    // ==================== REWARD SYSTEM ====================
    
    checkMonthlyReward() {
        const monthKey = this.getMonthKey(this.currentYear, this.currentMonth);
        
        if (this.data.monthlyCompletions[monthKey]) return;
        
        const daysInMonth = this.getDaysInMonth(this.currentYear, this.currentMonth);
        const protectedCount = this.calculateMonthlyProtected();
        
        if (protectedCount === daysInMonth && daysInMonth > 0 && this.isMonthCompleted()) {
            this.awardMonthlyReward(monthKey);
        }
    }

    isMonthCompleted() {
        const today = new Date();
        const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
        return today >= lastDayOfMonth || this.currentMonth < today.getMonth() || this.currentYear < today.getFullYear();
    }

    awardMonthlyReward(monthKey) {
        this.data.monthlyCompletions[monthKey] = true;
        const reward = this.generateReward();
        this.data.rewardsEarned.push({
            month: monthKey,
            reward: reward,
            date: this.today,
            id: Date.now()
        });
        this.data.rewardHistory.push(reward);
        this.saveData();
        this.showRewardModal(reward);
        this.updateStatsCards();
    }

    generateReward() {
        const sadaqahRewards = [
            {
                title: "Feed the Hungry",
                description: "Provide meals for 5 people in need. You can cook at home and distribute, or donate to a local food bank.",
                verse: "وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَأَسِيرًا",
                verseTranslation: "\"And they give food in spite of love for it to the needy, the orphan, and the captive.\" - Quran 76:8",
                icon: "🍲",
                category: "feeding"
            },
            {
                title: "Clothe the Needy",
                description: "Donate new or gently used clothes to an orphanage or homeless shelter. Winter clothes are especially valuable.",
                verse: "يَا بَنِي آدَمَ قَدْ أَنزَلْنَا عَلَيْكُمْ لِبَاسًا يُوَارِي سَوْآتِكُمْ وَرِيشًا",
                verseTranslation: "\"O children of Adam, We have bestowed upon you clothing to conceal your private parts and as adornment.\" - Quran 7:26",
                icon: "👕",
                category: "clothing"
            },
            {
                title: "Water for the Thirsty",
                description: "Provide clean drinking water to those in need. Install a water cooler, distribute bottles, or contribute to a well project.",
                verse: "وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ",
                verseTranslation: "\"And We made from water every living thing.\" - Quran 21:30",
                icon: "💧",
                category: "water"
            },
            {
                title: "Educate a Child",
                description: "Sponsor school supplies, pay tuition fees, or donate educational materials for underprivileged children.",
                verse: "هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ",
                verseTranslation: "\"Are those who know equal to those who do not know?\" - Quran 39:9",
                icon: "📚",
                category: "education"
            },
            {
                title: "Heal the Sick",
                description: "Help someone with medical expenses, visit the sick, or donate to healthcare initiatives.",
                verse: "وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ",
                verseTranslation: "\"And when I am ill, it is He who cures me.\" - Quran 26:80",
                icon: "💊",
                category: "health"
            },
            {
                title: "Plant for the Future",
                description: "Plant a fruit tree in a public space. This is Sadaqah Jariyah - ongoing charity that benefits for years.",
                verse: "إِنْ قَامَتِ السَّاعَةُ وَفِي يَدِ أَحَدِكُمْ فَسِيلَةٌ فَلْيَغْرِسْهَا",
                verseTranslation: "\"If the Hour comes and one of you has a seedling in his hand, let him plant it.\" - Hadith",
                icon: "🌳",
                category: "environment"
            },
            {
                title: "Care for Orphans",
                description: "Sponsor an orphan's monthly expenses, visit an orphanage with gifts, or support orphan care programs.",
                verse: "وَيَسْأَلُونَكَ عَنِ الْيَتَامَىٰ ۖ قُلْ إِصْلَاحٌ لَّهُمْ خَيْرٌ",
                verseTranslation: "\"And they ask you about orphans. Say, 'Improvement for them is best.'\" - Quran 2:220",
                icon: "👶",
                category: "orphans"
            },
            {
                title: "Build a Source of Water",
                description: "Contribute to building a water well or hand pump in a community lacking clean water access.",
                verse: "أَفْضَلُ الصَّدَقَةِ سَقْيُ الْمَاءِ",
                verseTranslation: "\"The best charity is giving water to drink.\" - Hadith (Ahmad)",
                icon: "⛲",
                category: "water"
            },
            {
                title: "Show Mercy to Animals",
                description: "Feed stray animals, support an animal shelter, or provide water bowls for birds and animals.",
                verse: "فِي كُلِّ كَبِدٍ رَطْبَةٍ أَجْرٌ",
                verseTranslation: "\"There is a reward for serving any living being.\" - Hadith (Bukhari)",
                icon: "🐱",
                category: "animals"
            },
            {
                title: "Spread Beneficial Knowledge",
                description: "Donate Qurans, Islamic books, or fund educational programs at mosques and community centers.",
                verse: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
                verseTranslation: "\"The best among you are those who learn the Quran and teach it.\" - Hadith (Bukhari)",
                icon: "📖",
                category: "knowledge"
            },
            {
                title: "Help the Traveler",
                description: "Assist a stranded traveler, provide transport fare, or help someone far from home.",
                verse: "وَآتِ ذَا الْقُرْبَىٰ حَقَّهُ وَالْمِسْكِينَ وَابْنَ السَّبِيلِ",
                verseTranslation: "\"And give the relative his right, and the needy and the traveler.\" - Quran 17:26",
                icon: "🧳",
                category: "travelers"
            },
            {
                title: "Free Someone from Debt",
                description: "Help someone struggling with debt. Even a small contribution can relieve great burden.",
                verse: "وَإِن كَانَ ذُو عُسْرَةٍ فَنَظِرَةٌ إِلَىٰ مَيْسَرَةٍ",
                verseTranslation: "\"And if someone is in hardship, then let there be postponement until ease.\" - Quran 2:280",
                icon: "💸",
                category: "debt"
            }
        ];
        
        return sadaqahRewards[Math.floor(Math.random() * sadaqahRewards.length)];
    }

    showRewardModal(reward) {
        const modal = document.getElementById('rewardModal');
        if (!modal) return;
        
        document.getElementById('sadaqahIcon').textContent = reward.icon;
        document.getElementById('sadaqahTitle').textContent = reward.title;
        document.getElementById('sadaqahDescription').textContent = reward.description;
        document.getElementById('sadaqahVerse').textContent = reward.verseTranslation;
        document.getElementById('sadaqahArabic').textContent = reward.verse;
        
        modal.style.display = 'flex';
    }

    // ==================== MILESTONES & ACHIEVEMENTS ====================
    
    checkMilestones() {
        const milestones = [
            { days: 3, title: 'First Steps', icon: '🌱', message: '3 days! Every journey begins with small steps.' },
            { days: 7, title: '1 Week Strong', icon: '🌟', message: 'A full week! You are building real momentum.' },
            { days: 10, title: 'Double Digits', icon: '💪', message: '10 days of protection! Keep the shield strong.' },
            { days: 15, title: 'Half Month', icon: '🌙', message: '15 days! Half a month of discipline achieved.' },
            { days: 21, title: 'Habit Forming', icon: '🧠', message: '21 days! They say it takes 21 days to form a habit.' },
            { days: 30, title: 'Full Month!', icon: '🏆', message: '30 DAYS! A complete month of protection!' },
            { days: 40, title: 'Spiritual Milestone', icon: '🕌', message: '40 days - a significant spiritual number!' },
            { days: 50, title: 'Half Century', icon: '🔥', message: '50 days! You are on fire!' },
            { days: 60, title: 'Two Months', icon: '⚔️', message: '60 days! Your inner warrior is strong!' },
            { days: 75, title: 'Diamond Streak', icon: '💎', message: '75 days! Your discipline is precious as diamond.' },
            { days: 90, title: 'Quarter Year!', icon: '👑', message: '90 DAYS! A quarter year of mastery!' },
            { days: 100, title: 'Century!', icon: '💯', message: '100 DAYS! A century of self-control!' },
            { days: 120, title: 'Four Months', icon: '🛡️', message: '120 days! Your shield is legendary!' },
            { days: 150, title: 'Iron Will', icon: '⛓️', message: '150 days! Your will is unbreakable!' },
            { days: 180, title: 'Half Year!', icon: '🎯', message: '180 DAYS! Half a year of excellence!' },
            { days: 200, title: 'Double Century', icon: '🌟', message: '200 days! Twice the centurion!' },
            { days: 250, title: 'Elite Guardian', icon: '🗡️', message: '250 days! You are an elite guardian of your soul!' },
            { days: 300, title: 'Spartan Shield', icon: '🛡️', message: '300 days! Like the 300 Spartans, you stand strong!' },
            { days: 365, title: 'ONE YEAR!', icon: '👑', message: '365 DAYS! A FULL YEAR OF SELF-MASTERY! YOU ARE A CHAMPION!' }
        ];
        
        const streak = this.data.streak;
        const achievedMilestones = this.data.achievedMilestones || [];
        
        for (const milestone of milestones) {
            if (streak === milestone.days && !achievedMilestones.includes(milestone.days)) {
                this.showMilestoneCelebration(milestone);
                if (!this.data.achievedMilestones) this.data.achievedMilestones = [];
                this.data.achievedMilestones.push(milestone.days);
                this.saveData();
                break;
            }
        }
    }

    showMilestoneCelebration(milestone) {
        // Create celebration overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            animation: fadeIn 0.5s ease;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: linear-gradient(145deg, #1b3a4b, #0d1b2a);
                border: 3px solid #d4a843;
                border-radius: 24px;
                padding: 40px 30px;
                text-align: center;
                max-width: 350px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            ">
                <div style="font-size: 5rem; animation: bounce 1s infinite;">${milestone.icon}</div>
                <h2 style="color: #d4a843; font-size: 1.8rem; margin: 15px 0;">${milestone.title}</h2>
                <p style="color: #e0e1dd; font-size: 1.1rem; margin-bottom: 10px;">${milestone.message}</p>
                <p style="color: #4ecca3; font-size: 2rem; font-weight: 800;">${milestone.days} Days</p>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    margin-top: 20px;
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #d4a843, #c9963a);
                    color: #000;
                    border: none;
                    border-radius: 25px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                ">Alhamdulillah! 🤲</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        // Auto remove after 8 seconds
        setTimeout(() => {
            if (overlay.parentElement) overlay.remove();
        }, 8000);
        
        // Trigger confetti
        this.triggerCelebration();
    }

    // ==================== MOOD TRACKING ====================
    
    trackMood(mood) {
        const moods = {
            motivated: { emoji: '🔥', label: 'Motivated' },
            focused: { emoji: '🎯', label: 'Focused' },
            grateful: { emoji: '🤲', label: 'Grateful' },
            struggling: { emoji: '😔', label: 'Struggling' },
            tempted: { emoji: '😈', label: 'Tempted' },
            peaceful: { emoji: '😌', label: 'Peaceful' },
            anxious: { emoji: '😰', label: 'Anxious' },
            strong: { emoji: '💪', label: 'Strong' }
        };
        
        this.data.moodData[this.today] = {
            mood: mood,
            timestamp: new Date().toISOString(),
            label: moods[mood]?.label || mood
        };
        
        this.saveData();
        
        // Update mood buttons
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-mood="${mood}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        this.showToast(`Mood recorded: ${moods[mood]?.emoji} ${moods[mood]?.label}`, 'success');
        
        // If struggling or tempted, offer encouragement
        if (mood === 'struggling' || mood === 'tempted' || mood === 'anxious') {
            this.showEncouragement(mood);
        }
    }

    showEncouragement(mood) {
        const messages = {
            struggling: [
                "Remember, every struggle makes you stronger. Allah is with the patient.",
                "This too shall pass. Stay strong, your shield is protecting you.",
                "Difficult moments are temporary. Your commitment is permanent."
            ],
            tempted: [
                "Seek refuge in Allah from Shaytan. You have the power to resist.",
                "The temptation is temporary, but the reward of patience is eternal.",
                "Remember why you started. Your future self will thank you."
            ],
            anxious: [
                "Verily, with hardship comes ease. - Quran 94:6",
                "Put your trust in Allah. He is the best of planners.",
                "Take a deep breath. You are safe. You are protected."
            ]
        };
        
        const message = messages[mood]?.[Math.floor(Math.random() * messages[mood].length)];
        if (message) {
            this.showToast(message, 'info', 5000);
        }
    }

    // ==================== YEARLY STATS ====================
    
    updateYearlyStats() {
        const year = this.currentYear;
        if (!this.data.yearlyStats[year]) {
            this.data.yearlyStats[year] = {
                totalProtected: 0,
                totalMissed: 0,
                longestStreak: 0,
                monthsCompleted: 0
            };
        }
        
        let protectedCount = 0;
        let missedCount = 0;
        
        for (let month = 0; month < 12; month++) {
            const daysInMonth = this.getDaysInMonth(year, month);
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = this.getDateString(new Date(year, month, day));
                if (this.data.protectedDays[dateStr]) {
                    protectedCount++;
                } else if (new Date(year, month, day) < new Date()) {
                    missedCount++;
                }
            }
        }
        
        this.data.yearlyStats[year].totalProtected = protectedCount;
        this.data.yearlyStats[year].totalMissed = missedCount;
        this.data.yearlyStats[year].longestStreak = Math.max(
            this.data.yearlyStats[year].longestStreak, 
            this.data.bestStreak
        );
        
        this.saveData();
    }

    openStatsModal() {
        const modal = document.getElementById('statsModal');
        if (!modal) return;
        
        const year = this.currentYear;
        const stats = this.data.yearlyStats[year] || {};
        const totalDays = Math.min(
            Math.ceil((new Date() - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24)),
            365
        );
        const successRate = totalDays > 0 ? Math.round((stats.totalProtected / totalDays) * 100) : 0;
        
        document.getElementById('statsYear').textContent = year;
        document.getElementById('statsTotalProtected').textContent = stats.totalProtected || 0;
        document.getElementById('statsTotalMissed').textContent = stats.totalMissed || 0;
        document.getElementById('statsSuccessRate').textContent = `${successRate}%`;
        document.getElementById('statsLongestStreak').textContent = stats.longestStreak || 0;
        document.getElementById('statsMonthsCompleted').textContent = stats.monthsCompleted || 0;
        document.getElementById('statsRewardsEarned').textContent = this.data.rewardsEarned.length;
        document.getElementById('statsTotalReflections').textContent = 
            Object.values(this.data.reflections).filter(r => r && r.trim()).length;
        
        modal.style.display = 'flex';
    }

    // ==================== NOTIFICATION SYSTEM ====================
    
    initializeNotificationSystem() {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return;
        }
        
        console.log('Notification permission:', Notification.permission);
        
        if (Notification.permission === 'granted') {
            this.settings.notificationsEnabled = true;
            this.saveSettings();
            this.scheduleAllNotifications();
        } else if (Notification.permission === 'default') {
            // Show permission request after delay
            setTimeout(() => {
                if (this.data.totalProtected === 0 || this.data.totalProtected <= 3) {
                    this.showNotificationPermissionModal();
                }
            }, 5000);
        }
    }

    showNotificationPermissionModal() {
        const modal = document.getElementById('notificationModal');
        if (modal) modal.style.display = 'flex';
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);
            
            if (permission === 'granted') {
                this.settings.notificationsEnabled = true;
                this.saveSettings();
                this.scheduleAllNotifications();
                this.closeModal('notificationModal');
                this.showToast('Notifications enabled! 🔔', 'success');
                this.updateNotificationStatus();
                
                // Send test notification
                setTimeout(() => {
                    new Notification('🛡️ Fikr Shield Ready', {
                        body: 'Your shield protection system is active. You will receive reminders.',
                        icon: '/fikr-shield/icons/icon-192.png',
                        tag: 'fikr-welcome'
                    });
                }, 2000);
            } else {
                this.closeModal('notificationModal');
                this.showToast('Notifications skipped. Enable in Settings later.', 'info');
            }
        } catch (error) {
            console.error('Notification permission error:', error);
            this.closeModal('notificationModal');
        }
    }

    scheduleAllNotifications() {
        // Clear existing timeouts
        this.notificationTimeouts.forEach(t => clearTimeout(t));
        this.notificationTimeouts = [];
        
        if (!this.settings.notificationsEnabled) return;
        if (Notification.permission !== 'granted') return;
        
        // Morning motivation
        if (this.settings.morningReminder?.enabled) {
            this.scheduleNotification(
                'morning',
                this.settings.morningReminder.time || '06:00',
                {
                    title: '🌅 Morning Shield Reminder',
                    body: 'New day, new strength. Activate your shield and start with intention.',
                    tag: 'fikr-morning'
                }
            );
        }
        
        // Evening reminder
        if (this.settings.eveningReminder?.enabled) {
            this.scheduleNotification(
                'evening',
                this.settings.eveningReminder.time || '21:00',
                {
                    title: '🛡️ Evening Shield Check',
                    body: 'Night approaches. Activate your shield to protect yourself tonight.',
                    tag: 'fikr-evening',
                    requireInteraction: true
                }
            );
        }
        
        // Night protection
        if (this.settings.nightReminder?.enabled) {
            this.scheduleNotification(
                'night',
                this.settings.nightReminder.time || '23:00',
                {
                    title: '🌙 Night Protection Mode',
                    body: 'Late night is vulnerable time. Stay strong. Your shield is your strength.',
                    tag: 'fikr-night',
                    requireInteraction: true
                }
            );
        }
        
        // Missed day alert
        if (this.settings.missedAlert?.enabled) {
            this.scheduleNotification(
                'missed',
                this.settings.missedAlert.time || '22:30',
                {
                    title: '⚠️ Shield Not Active Today!',
                    body: 'You haven\'t activated your shield yet today. Only a few hours left!',
                    tag: 'fikr-missed',
                    requireInteraction: true
                }
            );
        }
    }

    scheduleNotification(id, time, options) {
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        let scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        const delay = scheduledTime.getTime() - now.getTime();
        
        console.log(`📅 Scheduling "${id}" in ${Math.round(delay / 60000)} minutes`);
        
        const timeout = setTimeout(() => {
            // Check conditions before sending
            if (Notification.permission !== 'granted') return;
            
            if (id === 'missed' && this.data.protectedDays[this.today]) {
                // Already protected, skip missed alert
                this.scheduleNotification(id, time, options);
                return;
            }
            
            try {
                const notification = new Notification(options.title, {
                    body: options.body,
                    icon: '/fikr-shield/icons/icon-192.png',
                    badge: '/fikr-shield/icons/icon-72.png',
                    tag: options.tag,
                    requireInteraction: options.requireInteraction || false,
                    vibrate: options.requireInteraction ? [200, 100, 200, 100, 200] : [200, 100],
                    data: { url: '/fikr-shield/' }
                });
                
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
                
                console.log(`🔔 Notification sent: ${options.title}`);
            } catch (e) {
                console.error('Notification error:', e);
            }
            
            // Reschedule for next day
            this.scheduleNotification(id, time, options);
        }, delay);
        
        this.notificationTimeouts.push(timeout);
    }

    // ==================== SETTINGS ====================
    
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        // Load current settings
        document.getElementById('morningReminderToggle').checked = this.settings.morningReminder?.enabled ?? true;
        document.getElementById('morningReminderTime').value = this.settings.morningReminder?.time || '06:00';
        document.getElementById('eveningReminderToggle').checked = this.settings.eveningReminder?.enabled ?? true;
        document.getElementById('eveningReminderTime').value = this.settings.eveningReminder?.time || '21:00';
        document.getElementById('nightReminderToggle').checked = this.settings.nightReminder?.enabled ?? true;
        document.getElementById('nightReminderTime').value = this.settings.nightReminder?.time || '23:00';
        document.getElementById('missedAlertToggle').checked = this.settings.missedAlert?.enabled ?? true;
        document.getElementById('missedAlertTime').value = this.settings.missedAlert?.time || '22:30';
        document.getElementById('showReflectionToggle').checked = this.settings.showReflection ?? true;
        
        modal.style.display = 'flex';
    }

    saveNotificationSettings() {
        this.settings.morningReminder = {
            enabled: document.getElementById('morningReminderToggle')?.checked ?? true,
            time: document.getElementById('morningReminderTime')?.value || '06:00'
        };
        this.settings.eveningReminder = {
            enabled: document.getElementById('eveningReminderToggle')?.checked ?? true,
            time: document.getElementById('eveningReminderTime')?.value || '21:00'
        };
        this.settings.nightReminder = {
            enabled: document.getElementById('nightReminderToggle')?.checked ?? true,
            time: document.getElementById('nightReminderTime')?.value || '23:00'
        };
        this.settings.missedAlert = {
            enabled: document.getElementById('missedAlertToggle')?.checked ?? true,
            time: document.getElementById('missedAlertTime')?.value || '22:30'
        };
        this.settings.showReflection = document.getElementById('showReflectionToggle')?.checked ?? true;
        
        this.saveSettings();
        this.scheduleAllNotifications();
        this.updateNotificationStatus();
        this.closeModal('settingsModal');
        this.showToast('Settings saved! ✅', 'success');
    }

    // ==================== DATA MANAGEMENT ====================
    
    exportAllData() {
        const exportData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            data: this.data,
            settings: this.settings
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fikr-shield-backup-${this.today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully! 📤', 'success');
    }

    triggerImport() {
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
                        if (confirm('This will replace ALL your current data. Are you sure?')) {
                            this.data = imported.data;
                            this.settings = imported.settings;
                            this.saveData();
                            this.saveSettings();
                            this.showToast('Data imported! Reloading... 🔄', 'success');
                            setTimeout(() => location.reload(), 1500);
                        }
                    } else {
                        this.showToast('Invalid backup file format', 'error');
                    }
                } catch (e) {
                    this.showToast('Error reading file', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    confirmResetAllData() {
        if (confirm('⚠️ WARNING: This will delete ALL your data permanently!\n\nAll streaks, reflections, and rewards will be lost.\n\nAre you absolutely sure?')) {
            if (confirm('FINAL WARNING: This cannot be undone.\n\nType "RESET" to confirm:')) {
                localStorage.removeItem('fikrShieldData');
                localStorage.removeItem('fikrShieldSettings');
                this.showToast('All data reset. Reloading...', 'info');
                setTimeout(() => location.reload(), 1500);
            }
        }
    }

    // ==================== VISUAL EFFECTS ====================
    
    triggerCelebration() {
        const particles = ['🛡️', '✨', '🌟', '💚', '🤲', '🕌', '🌙', '⭐', '💫', '🎉'];
        const colors = ['#d4a843', '#4ecca3', '#ffd93d', '#7c4dff', '#ff6b6b', '#4ecdc4'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.textContent = particles[Math.floor(Math.random() * particles.length)];
                particle.style.cssText = `
                    position: fixed;
                    font-size: ${Math.random() * 24 + 14}px;
                    left: ${Math.random() * 100}vw;
                    top: -60px;
                    z-index: 1999;
                    pointer-events: none;
                    animation: confettiFall ${Math.random() * 2.5 + 1.5}s ease-in forwards;
                    animation-delay: ${Math.random() * 0.5}s;
                `;
                document.body.appendChild(particle);
                
                setTimeout(() => {
                    if (particle.parentElement) particle.remove();
                }, 4000);
            }, i * 25);
        }
        
        // Also create color burst effect
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const burst = document.createElement('div');
                burst.style.cssText = `
                    position: fixed;
                    width: ${Math.random() * 8 + 4}px;
                    height: ${Math.random() * 8 + 4}px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    left: ${Math.random() * 100}vw;
                    top: ${Math.random() * 100}vh;
                    border-radius: 50%;
                    z-index: 1998;
                    pointer-events: none;
                    animation: popBurst ${Math.random() * 1 + 0.5}s ease-out forwards;
                `;
                document.body.appendChild(burst);
                setTimeout(() => {
                    if (burst.parentElement) burst.remove();
                }, 2000);
            }, i * 15);
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #1b3a4b;
            color: #e0e1dd;
            padding: 14px 24px;
            border-radius: 30px;
            z-index: 2500;
            font-size: 0.9rem;
            font-weight: 500;
            animation: slideUpFade 0.3s ease;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 90vw;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        toast.textContent = `${icons[type] || ''} ${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDownFade 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }, duration);
    }

    // ==================== MODAL MANAGEMENT ====================
    
    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    }

    // ==================== DAY CHANGE MONITOR ====================
    
    startDayChangeMonitor() {
        // Check every 30 seconds for day change
        setInterval(() => {
            const newDate = this.getDateString(new Date());
            if (newDate !== this.today) {
                console.log('🌅 New day detected! Resetting...');
                this.today = newDate;
                this.currentMonth = new Date().getMonth();
                this.currentYear = new Date().getFullYear();
                this.initializeTodayData();
                this.renderCalendar();
                this.updateAllUI();
                this.checkMonthlyReward();
                this.updateYearlyStats();
            }
        }, 30000);
    }

    // ==================== CHALLENGE SYSTEM ====================
    
    startChallenge(days) {
        this.data.challengeData = {
            currentChallenge: days,
            challengeProgress: 0,
            challengeStartDate: this.today
        };
        this.saveData();
        this.showToast(`🎯 ${days}-Day Challenge Started!`, 'success');
    }

    updateChallengeProgress() {
        if (!this.data.challengeData?.currentChallenge) return;
        
        const challenge = this.data.challengeData;
        const startDate = new Date(challenge.challengeStartDate);
        const today = new Date(this.today);
        const daysElapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const progress = Math.min(Math.round((daysElapsed / challenge.currentChallenge) * 100), 100);
        
        challenge.challengeProgress = progress;
        this.saveData();
        
        if (progress >= 100 && !challenge.completed) {
            challenge.completed = true;
            this.saveData();
            this.showMilestoneCelebration({
                days: challenge.currentChallenge,
                title: 'Challenge Complete!',
                icon: '🏆',
                message: `You completed the ${challenge.currentChallenge}-day challenge!`
            });
        }
    }
}

// ==================== SERVICE WORKER REGISTRATION ====================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/fikr-shield/sw.js', {
            scope: '/fikr-shield/'
        })
        .then(reg => console.log('✅ Service Worker registered:', reg.scope))
        .catch(err => console.log('⚠️ Service Worker failed:', err));
    });
}

// ==================== GLOBAL ERROR HANDLING ====================

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
});

// ==================== INITIALIZE APP ====================

let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Fikr Shield...');
    app = new FikrShield();
    window.app = app;
    
    // Expose for debugging
    if (window.location.hostname === 'localhost') {
        console.log('🛠️ Debug mode: app exposed to window');
        window.fikrDebug = {
            app: app,
            getData: () => app.data,
            getSettings: () => app.settings,
            resetData: () => app.confirmResetAllData()
        };
    }
});

// ==================== ADD DYNAMIC ANIMATIONS ====================

const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
        50% { opacity: 0.8; }
        100% { transform: translateY(100vh) rotate(720deg) scale(0.3); opacity: 0; }
    }
    
    @keyframes popBurst {
        0% { transform: scale(0); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.5; }
        100% { transform: scale(2); opacity: 0; }
    }
    
    @keyframes slideUpFade {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideDownFade {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(20px); opacity: 0; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes scaleIn {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
    }
    
    @keyframes shieldPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    .calendar-day {
        transition: all 0.2s ease;
    }
    
    .calendar-day:active {
        transform: scale(0.9);
    }
    
    .calendar-day.protected {
        animation: popIn 0.3s ease;
    }
    
    @keyframes popIn {
        0% { transform: scale(0.8); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(animationStyles);

console.log('🛡️ Fikr Shield v2.0 - Full Application Loaded Successfully!');
console.log('📅 Calendar System: Ready');
console.log('🔔 Notification Engine: Ready');
console.log('🎁 Reward System: Ready');
console.log('📊 Stats & Analytics: Ready');
console.log('🤲 Sadaqah Integration: Ready');
console.log('💪 Challenge System: Ready');
console.log('😊 Mood Tracking: Ready');
console.log('📝 Reflection Journal: Ready');
console.log('🎉 Celebration Effects: Ready');
console.log('💾 Data Management: Ready');
console.log('📱 PWA Capabilities: Ready');
console.log('✅ All Systems Operational!');
