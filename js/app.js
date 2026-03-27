// js/app.js - COMPLETE FIXED VERSION with proper initialization
import { authManager } from './auth/auth.js';
import { topologyManager } from './components/topology.js';
import { aiAssistant } from './components/ai-assistant.js';
import { apiClients } from './utils/api-clients.js';
import { offlineSync } from './utils/offline-sync.js';
import { dashboardManager } from './components/dashboard.js';
import { deviceManager } from './components/device-manager.js';
import { monitoringManager } from './components/monitoring.js';
import { securityInsights } from './components/security-insights.js';
import { reportGenerator } from './components/reports.js';
import { networkIntel } from './components/network-intel.js';

class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.isInitialized = false;
        this.realtimeListeners = [];
        this.performanceMetrics = {
            pageLoadTime: 0,
            apiResponseTime: [],
            memoryUsage: []
        };
        this.setupEventListeners();
        this.setupNavigation();
        this.setupThemeToggle();
        this.setupAdvancedFeatures();
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        console.log('[App] Initializing...');
        
        // Track performance
        this.performanceMetrics.pageLoadTime = performance.now();
        
        // Add loading indicator removal with animation
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            setTimeout(() => {
                gsap.to(loadingOverlay, {
                    opacity: 0,
                    duration: 0.5,
                    onComplete: () => {
                        loadingOverlay.style.display = 'none';
                    }
                });
            }, 1000);
        }
        
        // Initialize components that don't require auth
        this.initializeComponents();
        
        // Check if user is already logged in and handle UI accordingly
        this.checkInitialAuthState();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup error boundary
        this.setupErrorBoundary();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
        
        // Ensure auth visibility is correct
        this.ensureAuthVisibility();
    }

    checkInitialAuthState() {
        const user = authManager.currentUser;
        console.log('[App] Initial auth state check:', user ? `User: ${user.email}` : 'No user');
        
        if (user) {
            // User is logged in, ensure app is visible
            this.onUserLoggedIn({ detail: { user: user, role: authManager.userRole } });
        } else {
            // User is not logged in, ensure auth is visible
            this.ensureAuthVisibility();
        }
    }

    ensureAuthVisibility() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        
        if (!authManager.currentUser) {
            if (authContainer) {
                authContainer.style.display = 'flex';
                authContainer.style.visibility = 'visible';
                authContainer.style.opacity = '1';
            }
            if (appContainer) {
                appContainer.style.display = 'none';
            }
        } else {
            if (authContainer) {
                authContainer.style.display = 'none';
            }
            if (appContainer) {
                appContainer.style.display = 'block';
            }
        }
    }

    setupEventListeners() {
        // Auth form handling
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const googleLogin = document.getElementById('google-login');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                
                if (!email || !password) {
                    authManager.showToast('Please enter both email and password', 'warning');
                    return;
                }
                
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Logging in...';
                submitBtn.disabled = true;
                
                try {
                    await authManager.loginWithEmail(email, password);
                } finally {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('signup-name').value;
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                const role = document.getElementById('signup-role').value;
                
                if (!name || !email || !password) {
                    authManager.showToast('Please fill in all fields', 'warning');
                    return;
                }
                
                if (password.length < 6) {
                    authManager.showToast('Password must be at least 6 characters', 'warning');
                    return;
                }
                
                const submitBtn = signupForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Creating account...';
                submitBtn.disabled = true;
                
                try {
                    await authManager.signupWithEmail(name, email, password, role);
                } finally {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        if (googleLogin) {
            googleLogin.addEventListener('click', async () => {
                googleLogin.disabled = true;
                googleLogin.textContent = 'Connecting...';
                try {
                    await authManager.loginWithGoogle();
                } finally {
                    googleLogin.disabled = false;
                    googleLogin.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
                }
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await authManager.logout();
            });
        }
        
        // Auth tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                tab.classList.add('active');
                const form = document.getElementById(`${tabName}-form`);
                if (form) {
                    form.classList.add('active');
                    gsap.from(form, {
                        opacity: 0,
                        y: 20,
                        duration: 0.3
                    });
                }
            });
        });
        
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('mobile-open');
                    gsap.from(sidebar, {
                        opacity: 0,
                        x: -100,
                        duration: 0.3
                    });
                }
            });
        }
        
        // Notification bell
        const notificationBell = document.getElementById('notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotifications();
                notificationBell.classList.remove('pulse');
            });
        }
        
        // Listen for user login event
        window.addEventListener('userLoggedIn', (event) => this.onUserLoggedIn(event));
        
        // Listen for network status changes
        window.addEventListener('online', () => this.handleOnlineStatus());
        window.addEventListener('offline', () => this.handleOfflineStatus());
        
        // Listen for beforeunload to clean up
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });
    }

    navigateTo(page) {
        const navStart = performance.now();
        
        console.log('[App] Navigating to:', page);
        
        // Update active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
                gsap.from(item, {
                    scale: 0.95,
                    duration: 0.2
                });
            }
        });
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        
        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            gsap.from(targetPage, {
                opacity: 0,
                y: 20,
                duration: 0.4,
                ease: 'power2.out'
            });
        }
        
        this.currentPage = page;
        
        // Initialize page-specific components
        try {
            switch(page) {
                case 'topology':
                    setTimeout(() => {
                        if (topologyManager.initialize) {
                            topologyManager.initialize();
                        }
                    }, 100);
                    break;
                case 'dashboard':
                    if (dashboardManager.refresh) dashboardManager.refresh();
                    this.updateDashboardWidgets();
                    break;
                case 'devices':
                    if (deviceManager.loadDevices) deviceManager.loadDevices();
                    break;
                case 'monitoring':
                    if (monitoringManager.startMonitoring) monitoringManager.startMonitoring();
                    break;
                case 'security':
                    if (securityInsights.loadSecurityDashboard) securityInsights.loadSecurityDashboard();
                    break;
                case 'ai-assistant':
                    this.initializeAIAssistant();
                    break;
                case 'network-intel':
                    this.refreshNetworkIntel();
                    break;
                case 'reports':
                    if (reportGenerator.generatePreview) reportGenerator.generatePreview();
                    break;
            }
        } catch (error) {
            console.error(`[App] Error navigating to ${page}:`, error);
            this.showErrorPage(page, error);
        }
        
        // Close mobile menu
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
        
        // Update URL hash
        window.location.hash = page;
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.classList.add(`${savedTheme}-mode`);
        this.updateThemeIcon(savedTheme);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark-mode');
                const newTheme = isDark ? 'light' : 'dark';
                document.body.classList.remove(isDark ? 'dark-mode' : 'light-mode');
                document.body.classList.add(`${newTheme}-mode`);
                localStorage.setItem('theme', newTheme);
                this.updateThemeIcon(newTheme);
                
                gsap.to('body', {
                    duration: 0.3,
                    opacity: 0.95,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        document.body.style.opacity = '';
                    }
                });
                
                this.logAnalytics('theme_change', { theme: newTheme });
            });
        }
    }

    updateThemeIcon(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }
    }

    setupAdvancedFeatures() {
        this.setupVoiceCommands();
        this.setupDragAndDropUpload();
        this.setupInfiniteScroll();
        this.setupWebSocketConnection();
        this.setupServiceWorker();
        this.setupAnalytics();
    }

    setupVoiceCommands() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            const voiceBtn = document.createElement('button');
            voiceBtn.className = 'voice-command-btn';
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceBtn.title = 'Voice Commands';
            voiceBtn.onclick = () => this.startVoiceRecognition();
            
            const chatInput = document.getElementById('chat-input');
            if (chatInput && chatInput.parentNode) {
                chatInput.parentNode.insertBefore(voiceBtn, chatInput.nextSibling);
            }
        }
    }

    startVoiceRecognition() {
        if (!this.recognition) return;
        
        this.recognition.start();
        this.recognition.onresult = (event) => {
            const command = event.results[0][0].transcript;
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value = command;
                if (command.toLowerCase().includes('analyze') || 
                    command.toLowerCase().includes('check') ||
                    command.toLowerCase().includes('show')) {
                    setTimeout(() => {
                        const sendBtn = document.getElementById('send-message-btn');
                        if (sendBtn) sendBtn.click();
                    }, 500);
                }
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            authManager.showToast('Voice command not recognized', 'warning');
        };
    }

    setupDragAndDropUpload() {
        const devicesTable = document.getElementById('devices-table-container');
        if (devicesTable) {
            devicesTable.addEventListener('dragover', (e) => {
                e.preventDefault();
                devicesTable.classList.add('drag-over');
            });
            
            devicesTable.addEventListener('dragleave', () => {
                devicesTable.classList.remove('drag-over');
            });
            
            devicesTable.addEventListener('drop', async (e) => {
                e.preventDefault();
                devicesTable.classList.remove('drag-over');
                
                const files = Array.from(e.dataTransfer.files);
                for (const file of files) {
                    if (file.name.endsWith('.json') || file.name.endsWith('.conf')) {
                        await this.handleConfigUpload(file);
                    }
                }
            });
        }
    }

    async handleConfigUpload(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                let config;
                
                if (file.name.endsWith('.json')) {
                    config = JSON.parse(content);
                } else {
                    config = this.parseCiscoConfig(content);
                }
                
                if (this.validateDeviceConfig(config)) {
                    await deviceManager.bulkImportDevices(config.devices);
                    authManager.showToast(`Successfully imported ${config.devices.length} devices`, 'success');
                }
            } catch (error) {
                console.error('Config upload error:', error);
                authManager.showToast('Invalid configuration file', 'error');
            }
        };
        reader.readAsText(file);
    }

    parseCiscoConfig(content) {
        const devices = [];
        const lines = content.split('\n');
        let currentDevice = null;
        
        for (const line of lines) {
            if (line.startsWith('hostname')) {
                if (currentDevice) devices.push(currentDevice);
                currentDevice = {
                    name: line.split(' ')[1],
                    type: 'router',
                    ip: '192.168.1.1',
                    status: 'active'
                };
            } else if (line.startsWith('ip address')) {
                if (currentDevice) {
                    const parts = line.split(' ');
                    currentDevice.ip = parts[2];
                    currentDevice.subnet = parts[3];
                }
            } else if (line.startsWith('vlan')) {
                if (currentDevice) {
                    currentDevice.vlan = parseInt(line.split(' ')[1]);
                }
            }
        }
        
        if (currentDevice) devices.push(currentDevice);
        return { devices };
    }

    validateDeviceConfig(config) {
        return config.devices && Array.isArray(config.devices) && config.devices.length > 0;
    }

    setupInfiniteScroll() {
        let loading = false;
        
        const deviceContainer = document.getElementById('devices-table-container');
        if (deviceContainer) {
            const observer = new IntersectionObserver(async (entries) => {
                if (entries[0].isIntersecting && !loading && deviceManager.hasMore) {
                    loading = true;
                    await deviceManager.loadMoreDevices();
                    loading = false;
                }
            }, { threshold: 0.1 });
            
            observer.observe(deviceContainer);
        }
    }

    setupWebSocketConnection() {
        console.log('[App] Using Firebase Realtime DB for real-time updates');
        this.ws = null;
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('[App] ServiceWorker registration successful');
            }).catch(err => {
                console.error('[App] ServiceWorker registration failed:', err);
            });
        }
    }

    setupAnalytics() {
        this.trackPageView();
        
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-track]');
            if (target) {
                const event = target.dataset.track;
                this.logAnalytics(event, {
                    element: target.tagName,
                    text: target.textContent
                });
            }
        });
    }

    trackPageView() {
        this.logAnalytics('page_view', {
            page: this.currentPage,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        });
    }

    logAnalytics(event, data = {}) {
        const analytics = JSON.parse(localStorage.getItem('analytics') || '[]');
        analytics.push({
            event,
            data,
            timestamp: Date.now()
        });
        
        if (analytics.length > 1000) analytics.shift();
        
        localStorage.setItem('analytics', JSON.stringify(analytics));
        
        if (navigator.onLine) {
            console.log('[Analytics]', event, data);
        }
    }

    setupErrorBoundary() {
        window.addEventListener('error', (event) => {
            console.error('[Global error]', event.error);
            this.logAnalytics('error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
            
            if (event.error?.message?.includes('Firebase')) {
                authManager.showToast('Network connection issue. Using cached data.', 'warning');
            }
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[Unhandled rejection]', event.reason);
            this.logAnalytics('unhandled_rejection', {
                reason: event.reason?.message || 'Unknown'
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.navigateTo('ai-assistant');
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.navigateTo('dashboard');
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.navigateTo('topology');
            }
            
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal.show');
                modals.forEach(modal => {
                    bootstrap.Modal.getInstance(modal)?.hide();
                });
            }
            
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                if (reportGenerator.generatePDFReport) {
                    reportGenerator.generatePDFReport();
                }
            }
        });
    }

    startPerformanceMonitoring() {
        if (performance.memory) {
            setInterval(() => {
                this.performanceMetrics.memoryUsage.push({
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    timestamp: Date.now()
                });
                
                if (performance.memory.usedJSHeapSize > 500 * 1024 * 1024) {
                    console.warn('[Performance] High memory usage detected');
                    this.showNotification('High memory usage detected. Consider refreshing the page.', 'warning');
                }
            }, 30000);
        }
    }

    initializeComponents() {
        try {
            // Initialize components that don't require auth
            if (networkIntel && networkIntel.setupEventListeners) {
                networkIntel.setupEventListeners();
            }
        } catch (error) {
            console.error('[App] Error initializing components:', error);
        }
    }

    onUserLoggedIn(event) {
        const { user, role } = event.detail;
        console.log('[App] User logged in event received:', user.email, 'Role:', role);
        
        this.logAnalytics('user_login', {
            role: role,
            method: user.providerData[0]?.providerId || 'email'
        });
        
        // Update UI for role
        this.updateUIForRole(role);
        
        // Start real-time updates
        this.startRealTimeUpdates();
        
        // Initialize all components that need auth
        setTimeout(() => {
            try {
                console.log('[App] Initializing auth-dependent components...');
                
                // Initialize components in sequence
                if (dashboardManager.initialize) dashboardManager.initialize();
                if (deviceManager.initialize) deviceManager.initialize();
                if (monitoringManager.initialize) monitoringManager.initialize();
                if (securityInsights.initialize) securityInsights.initialize();
                if (reportGenerator.initialize) reportGenerator.initialize();
                
                // Load initial data
                if (deviceManager.loadDevices) deviceManager.loadDevices();
                if (dashboardManager.refresh) dashboardManager.refresh();
                
                // Load user preferences
                this.loadUserPreferences();
                
                console.log('[App] Auth-dependent components initialized');
                
            } catch (error) {
                console.error('[App] Error initializing auth components:', error);
            }
        }, 100);
        
        // Show welcome toast
        setTimeout(() => {
            const welcomeMessage = role === 'admin' 
                ? `Welcome back, Administrator ${user.displayName || 'User'}! You have full control.`
                : `Welcome to NetworkPulse, ${user.displayName || 'User'}!`;
            authManager.showToast(welcomeMessage, 'success');
            
            if (role === 'admin') {
                setTimeout(() => {
                    authManager.showToast('Admin Tip: You can manage all devices and user roles from the Device Management panel.', 'info');
                }, 3000);
            } else if (role === 'network-engineer') {
                setTimeout(() => {
                    authManager.showToast('Engineer Tip: Use the AI Assistant for configuration suggestions and troubleshooting.', 'info');
                }, 3000);
            }
        }, 500);
    }

    loadUserPreferences() {
        const preferences = localStorage.getItem('userPreferences');
        if (preferences) {
            const prefs = JSON.parse(preferences);
            if (prefs.defaultPage) {
                this.navigateTo(prefs.defaultPage);
            }
            if (prefs.chartType && monitoringManager.updateChartType) {
                monitoringManager.updateChartType(prefs.chartType);
            }
        }
    }

    saveUserPreferences() {
        const preferences = {
            defaultPage: this.currentPage,
            theme: localStorage.getItem('theme'),
            lastLogin: Date.now()
        };
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
    }

    updateUIForRole(role) {
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        const isAdmin = role === 'admin';
        
        adminOnlyElements.forEach(el => {
            if (isAdmin) {
                el.style.display = 'block';
                gsap.from(el, { opacity: 0, y: -10, duration: 0.3 });
            } else {
                el.style.display = 'none';
            }
        });
        
        const isEngineer = role === 'network-engineer' || role === 'admin';
        document.querySelectorAll('.engineer-only').forEach(el => {
            if (isEngineer) {
                el.style.display = 'block';
                gsap.from(el, { opacity: 0, y: -10, duration: 0.3 });
            } else {
                el.style.display = 'none';
            }
        });
        
        document.querySelectorAll(`.role-${role}`).forEach(el => {
            el.style.display = 'block';
        });
    }

    startRealTimeUpdates() {
        try {
            const networkStatusRef = firebase.database().ref('networkStatus');
            const listener = networkStatusRef.on('value', (snapshot) => {
                const status = snapshot.val();
                if (status) {
                    this.updateNetworkStatus(status);
                }
            });
            this.realtimeListeners.push({ ref: networkStatusRef, listener });
        } catch (error) {
            console.error('[App] Error setting up real-time updates:', error);
        }
        
        setInterval(() => {
            this.updateConnectionStatus();
        }, 5000);
        
        firebase.database().ref('.info/connected').on('value', (snap) => {
            if (snap.val() === true) {
                console.log('[App] Connected to Firebase');
                this.handleFirebaseReconnect();
            } else {
                console.log('[App] Disconnected from Firebase');
            }
        });
    }

    handleFirebaseReconnect() {
        if (offlineSync && offlineSync.syncData) {
            offlineSync.syncData();
        }
        
        if (deviceManager.loadDevices) deviceManager.loadDevices();
        if (dashboardManager.refresh) dashboardManager.refresh();
        
        authManager.showToast('Reconnected to server. Syncing data...', 'success');
    }

    updateNetworkStatus(status) {
        const healthScore = document.getElementById('network-health');
        if (healthScore) {
            const oldValue = parseInt(healthScore.textContent);
            gsap.to({ val: oldValue }, {
                val: status.healthScore,
                duration: 0.5,
                onUpdate: function() {
                    healthScore.textContent = Math.round(this.targets()[0].val) + '%';
                }
            });
        }
        
        const healthStatus = document.getElementById('health-status');
        if (healthStatus) {
            healthStatus.textContent = status.healthStatus;
            healthStatus.className = `health-status status-${status.healthStatus.toLowerCase()}`;
        }
    }

    updateConnectionStatus() {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            if (navigator.onLine) {
                statusEl.classList.remove('offline');
                statusEl.innerHTML = '<i class="fas fa-wifi"></i> Online';
                statusEl.style.color = 'var(--success-color)';
            } else {
                statusEl.classList.add('offline');
                statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
                statusEl.style.color = 'var(--danger-color)';
            }
        }
    }

    async showNotifications() {
        try {
            const notifications = await db.collection('notifications')
                .where('userId', '==', authManager.currentUser?.uid)
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
            
            const modal = document.createElement('div');
            modal.id = 'notificationsModal';
            modal.className = 'modal fade';
            modal.setAttribute('tabindex', '-1');
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content glass-effect">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-bell"></i> Notifications
                                ${!notifications.empty ? `<span class="badge bg-primary ms-2">${notifications.size}</span>` : ''}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                            ${notifications.empty ? 
                                '<div class="empty-notifications"><i class="fas fa-bell-slash fa-3x mb-3"></i><p>No notifications yet</p></div>' :
                                notifications.docs.map(doc => {
                                    const n = doc.data();
                                    return `
                                        <div class="notification-item ${n.read ? 'read' : 'unread'}">
                                            <div class="notification-icon">
                                                <i class="fas ${n.icon || 'fa-bell'}"></i>
                                            </div>
                                            <div class="notification-content">
                                                <div class="d-flex justify-content-between">
                                                    <strong>${n.title}</strong>
                                                    <small class="text-muted">${this.formatTimeAgo(n.timestamp?.toDate())}</small>
                                                </div>
                                                <p>${n.message}</p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')
                            }
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            modal.addEventListener('hidden.bs.modal', () => modal.remove());
            
        } catch (error) {
            console.error('[App] Error loading notifications:', error);
            authManager.showToast('Failed to load notifications', 'error');
        }
    }

    formatTimeAgo(date) {
        if (!date) return 'Unknown';
        const seconds = Math.floor((new Date() - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
            }
        }
        
        return 'Just now';
    }

    initializeAIAssistant() {
        if (aiAssistant && aiAssistant.getContextSuggestions) {
            const context = {
                devices: deviceManager.devices,
                networkHealth: monitoringManager.metrics,
                alerts: dashboardManager.alerts
            };
            aiAssistant.getContextSuggestions(context);
        }
    }

    refreshNetworkIntel() {
        if (networkIntel && networkIntel.refreshData) {
            networkIntel.refreshData();
        }
    }

    updateDashboardWidgets() {
        const widgets = document.querySelectorAll('.widget');
        widgets.forEach(widget => {
            gsap.from(widget, {
                scale: 0.95,
                opacity: 0,
                duration: 0.3,
                stagger: 0.05
            });
        });
    }

    showErrorPage(page, error) {
        const pageContainer = document.getElementById(`${page}-page`);
        if (pageContainer) {
            pageContainer.innerHTML = `
                <div class="error-page glass-effect">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3" style="color: var(--danger-color)"></i>
                    <h3>Failed to Load ${page}</h3>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button class="btn-primary mt-3" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    handleOnlineStatus() {
        authManager.showToast('Back online! Syncing data...', 'success');
        this.updateConnectionStatus();
        if (offlineSync && offlineSync.syncData) {
            offlineSync.syncData();
        }
    }

    handleOfflineStatus() {
        this.updateConnectionStatus();
        const statusEl = document.getElementById('connection-status');
        if (statusEl && !statusEl.classList.contains('offline')) {
            statusEl.classList.add('offline');
            statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
            authManager.showToast('You are offline. Using cached data.', 'warning');
        }
    }

    cleanup() {
        this.realtimeListeners.forEach(({ ref, listener }) => {
            if (ref && listener) {
                ref.off('value', listener);
            }
        });
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
        
        if (monitoringManager && monitoringManager.stopMonitoring) {
            monitoringManager.stopMonitoring();
        }
        
        this.saveUserPreferences();
        
        this.logAnalytics('session_end', {
            duration: performance.now() - this.performanceMetrics.pageLoadTime
        });
    }

    showNotification(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = () => toast.remove();
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
    });
} else {
    window.app = new App();
}