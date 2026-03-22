// js/app.js (COMPLETE - All features preserved with enhancements)
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
        
        // Check if user is already logged in
        if (authManager.currentUser) {
            this.onUserLoggedIn({ detail: { user: authManager.currentUser, role: authManager.userRole } });
        }
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup error boundary
        this.setupErrorBoundary();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
    }

    setupEventListeners() {
        // Auth form handling with better error prevention
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
                
                // Show loading state
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
                
                // Show loading state
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

        // Auth tab switching with animation
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

        // Mobile menu toggle with animation
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

        // Notification bell with pulse animation
        const notificationBell = document.getElementById('notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotifications();
                // Remove pulse animation
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
        // Track navigation performance
        const navStart = performance.now();
        
        // Update active states with animation
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
            
            // Animate page transition
            gsap.from(targetPage, {
                opacity: 0,
                y: 20,
                duration: 0.4,
                ease: 'power2.out',
                onComplete: () => {
                    // Log navigation performance
                    const navTime = performance.now() - navStart;
                    this.performanceMetrics.apiResponseTime.push(navTime);
                }
            });
        }
        
        this.currentPage = page;
        
        // Initialize page-specific components with error handling
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
                    // Update real-time widgets
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
            console.error(`Error navigating to ${page}:`, error);
            this.showErrorPage(page, error);
        }
        
        // Close mobile menu if open
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
        
        // Update URL hash for deep linking
        window.location.hash = page;
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.classList.add(`${savedTheme}-mode`);
        
        // Update theme toggle icon
        this.updateThemeIcon(savedTheme);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark-mode');
                const newTheme = isDark ? 'light' : 'dark';
                
                document.body.classList.remove(isDark ? 'dark-mode' : 'light-mode');
                document.body.classList.add(`${newTheme}-mode`);
                localStorage.setItem('theme', newTheme);
                
                this.updateThemeIcon(newTheme);
                
                // Animate theme change with smooth transition
                gsap.to('body', {
                    duration: 0.3,
                    opacity: 0.95,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        document.body.style.opacity = '';
                    }
                });
                
                // Log theme change
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
        // Setup advanced features
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
            
            // Add voice command button to AI assistant
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
                // Auto-send if it's a command
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
        // Setup drag and drop for device configuration upload
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
                    // Parse Cisco-style config
                    config = this.parseCiscoConfig(content);
                }
                
                // Validate config
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
        // Parse Cisco-style configuration
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
        // Setup infinite scroll for device list
        let loading = false;
        let page = 1;
        const deviceContainer = document.getElementById('devices-table-container');
        
        if (deviceContainer) {
            const observer = new IntersectionObserver(async (entries) => {
                if (entries[0].isIntersecting && !loading) {
                    loading = true;
                    page++;
                    await deviceManager.loadMoreDevices(page);
                    loading = false;
                }
            }, { threshold: 0.1 });
            
            observer.observe(deviceContainer);
        }
    }

    setupWebSocketConnection() {
        // Setup WebSocket for real-time updates (optional - use Firebase Realtime DB instead)
        // Disabled WebSocket to avoid errors - using Firebase Realtime DB is more reliable
        console.log('Using Firebase Realtime DB for real-time updates');
        
        // Optional: Add a custom WebSocket server if needed
        // For now, we'll rely on Firebase
        this.ws = null;
    }

    handleWebSocketMessage(data) {
        // Only called if WebSocket is used
        console.log('WebSocket message received:', data);
    }

    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'device-update':
                deviceManager.updateDeviceStatus(data.device);
                break;
            case 'alert':
                this.showNotification(data.alert);
                break;
            case 'metric':
                monitoringManager.updateMetric(data.metric);
                break;
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registration successful');
            }).catch(err => {
                console.error('ServiceWorker registration failed:', err);
            });
        }
    }

    setupAnalytics() {
        // Setup analytics tracking
        this.trackPageView();
        
        // Track user interactions
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
        // Store in Firebase Analytics or local storage
        const analytics = JSON.parse(localStorage.getItem('analytics') || '[]');
        analytics.push({
            event,
            data,
            timestamp: Date.now()
        });
        
        // Keep only last 1000 events
        if (analytics.length > 1000) analytics.shift();
        
        localStorage.setItem('analytics', JSON.stringify(analytics));
        
        // Send to server if online
        if (navigator.onLine) {
            // Could send to Firebase Analytics here
            console.log('Analytics:', event, data);
        }
    }

    setupErrorBoundary() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logAnalytics('error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
            
            // Show user-friendly error
            if (event.error?.message?.includes('Firebase')) {
                authManager.showToast('Network connection issue. Using cached data.', 'warning');
            }
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled rejection:', event.reason);
            this.logAnalytics('unhandled_rejection', {
                reason: event.reason?.message || 'Unknown'
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K - Focus AI Assistant
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.navigateTo('ai-assistant');
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }
            
            // Ctrl/Cmd + D - Dashboard
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.navigateTo('dashboard');
            }
            
            // Ctrl/Cmd + T - Topology
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.navigateTo('topology');
            }
            
            // Escape - Close modals
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal.show');
                modals.forEach(modal => {
                    bootstrap.Modal.getInstance(modal)?.hide();
                });
            }
            
            // Ctrl/Cmd + Shift + R - Generate Report
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                if (reportGenerator.generatePDFReport) {
                    reportGenerator.generatePDFReport();
                }
            }
        });
    }

    startPerformanceMonitoring() {
        // Monitor memory usage
        if (performance.memory) {
            setInterval(() => {
                this.performanceMetrics.memoryUsage.push({
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    timestamp: Date.now()
                });
                
                // Alert if memory usage is high
                if (performance.memory.usedJSHeapSize > 500 * 1024 * 1024) {
                    console.warn('High memory usage detected');
                    this.showNotification('High memory usage detected. Consider refreshing the page.', 'warning');
                }
            }, 30000);
        }
    }

    initializeComponents() {
        // Initialize components that don't require auth
        try {
            if (networkIntel && networkIntel.setupEventListeners) {
                networkIntel.setupEventListeners();
            }
        } catch (error) {
            console.error('Error initializing network intel:', error);
        }
    }

    onUserLoggedIn(event) {
        const { user, role } = event.detail;
        
        // Track login
        this.logAnalytics('user_login', {
            role: role,
            method: user.providerData[0]?.providerId || 'email'
        });
        
        // Update UI for role with animation
        this.updateUIForRole(role);
        
        // Start real-time updates
        this.startRealTimeUpdates();
        
        // Initialize all components that need auth with staggered loading
        setTimeout(() => {
            try {
                // Initialize components in sequence to avoid overload
                const initComponents = [
                    () => dashboardManager.initialize && dashboardManager.initialize(),
                    () => deviceManager.initialize && deviceManager.initialize(),
                    () => monitoringManager.initialize && monitoringManager.initialize(),
                    () => securityInsights.initialize && securityInsights.initialize(),
                    () => reportGenerator.initialize && reportGenerator.initialize()
                ];
                
                let index = 0;
                const initializeNext = () => {
                    if (index < initComponents.length) {
                        initComponents[index]();
                        index++;
                        setTimeout(initializeNext, 200);
                    }
                };
                
                initializeNext();
                
                // Load initial data
                if (deviceManager.loadDevices) deviceManager.loadDevices();
                if (dashboardManager.refresh) dashboardManager.refresh();
                
                // Load user preferences
                this.loadUserPreferences();
                
            } catch (error) {
                console.error('Error initializing components:', error);
            }
        }, 100);
        
        // Show welcome toast with user name
        setTimeout(() => {
            const welcomeMessage = role === 'admin' 
                ? `Welcome back, Administrator ${user.displayName || 'User'}! You have full control.`
                : `Welcome to NetworkPulse, ${user.displayName || 'User'}!`;
            authManager.showToast(welcomeMessage, 'success');
            
            // Show role-specific tips
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
        // Hide admin-only features for non-admin users
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
        
        // Network engineer permissions
        const isEngineer = role === 'network-engineer' || role === 'admin';
        document.querySelectorAll('.engineer-only').forEach(el => {
            if (isEngineer) {
                el.style.display = 'block';
                gsap.from(el, { opacity: 0, y: -10, duration: 0.3 });
            } else {
                el.style.display = 'none';
            }
        });
        
        // Show/hide based on role
        document.querySelectorAll(`.role-${role}`).forEach(el => {
            el.style.display = 'block';
        });
    }

    startRealTimeUpdates() {
        // Listen for real-time network updates with better error handling
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
            console.error('Error setting up real-time updates:', error);
        }
        
        // Check connection status periodically with visual feedback
        setInterval(() => {
            this.updateConnectionStatus();
            this.checkFirebaseConnection();
        }, 5000);
        
        // Monitor Firebase connection
        firebase.database().ref('.info/connected').on('value', (snap) => {
            if (snap.val() === true) {
                console.log('Connected to Firebase');
                this.handleFirebaseReconnect();
            } else {
                console.log('Disconnected from Firebase');
            }
        });
    }

    async checkFirebaseConnection() {
        try {
            const testRef = firebase.database().ref('.info/connected');
            const snapshot = await testRef.once('value');
            if (!snapshot.val()) {
                console.warn('Firebase connection lost');
                this.showOfflineIndicator();
            }
        } catch (error) {
            console.error('Firebase connection check failed:', error);
            this.showOfflineIndicator();
        }
    }

    handleFirebaseReconnect() {
        // Resync data when reconnected
        if (offlineSync && offlineSync.syncData) {
            offlineSync.syncData();
        }
        
        // Reload fresh data
        if (deviceManager.loadDevices) deviceManager.loadDevices();
        if (dashboardManager.refresh) dashboardManager.refresh();
        
        authManager.showToast('Reconnected to server. Syncing data...', 'success');
    }

    showOfflineIndicator() {
        const statusEl = document.getElementById('connection-status');
        if (statusEl && !statusEl.classList.contains('offline')) {
            statusEl.classList.add('offline');
            statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
            authManager.showToast('You are offline. Using cached data.', 'warning');
        }
    }

    updateNetworkStatus(status) {
        const healthScore = document.getElementById('network-health');
        if (healthScore) {
            // Animate score change
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
            // Update status color
            healthStatus.className = `health-status status-${status.healthStatus.toLowerCase()}`;
        }
        
        // Update network health gauge if present
        this.updateNetworkGauge(status.healthScore);
    }

    updateNetworkGauge(score) {
        const gauge = document.getElementById('network-gauge');
        if (gauge) {
            const percentage = score;
            const color = percentage > 80 ? '#00ff9d' : percentage > 60 ? '#ffd93d' : '#ff4757';
            gauge.style.background = `conic-gradient(${color} 0deg ${percentage * 3.6}deg, #2c3e50 ${percentage * 3.6}deg 360deg)`;
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
                                                ${n.actions ? `
                                                    <div class="notification-actions mt-2">
                                                        ${n.actions.map(action => `
                                                            <button class="btn-sm btn-outline-primary me-2" data-action="${action.type}" data-id="${doc.id}">
                                                                ${action.label}
                                                            </button>
                                                        `).join('')}
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')
                            }
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" data-bs-dismiss="modal">Close</button>
                            ${!notifications.empty ? '<button id="mark-all-read" class="btn-primary">Mark All as Read</button>' : ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            
            // Handle mark all as read
            const markAllBtn = document.getElementById('mark-all-read');
            if (markAllBtn) {
                markAllBtn.addEventListener('click', async () => {
                    const batch = db.batch();
                    notifications.forEach(doc => {
                        batch.update(doc.ref, { read: true });
                    });
                    await batch.commit();
                    modalInstance.hide();
                    this.updateNotificationBadge(0);
                    authManager.showToast('All notifications marked as read', 'success');
                });
            }
            
            // Handle action buttons
            document.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const action = btn.dataset.action;
                    const id = btn.dataset.id;
                    await this.handleNotificationAction(action, id);
                    modalInstance.hide();
                });
            });
            
            modal.addEventListener('hidden.bs.modal', () => modal.remove());
            
            // Mark notifications as read
            if (!notifications.empty) {
                const batch = db.batch();
                notifications.forEach(doc => {
                    if (!doc.data().read) {
                        batch.update(doc.ref, { read: true });
                    }
                });
                await batch.commit();
                
                this.updateNotificationBadge(0);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
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

    async handleNotificationAction(action, notificationId) {
        switch(action) {
            case 'view_device':
                this.navigateTo('devices');
                break;
            case 'acknowledge_alert':
                await db.collection('alerts').doc(notificationId).update({ acknowledged: true });
                authManager.showToast('Alert acknowledged', 'success');
                break;
            case 'generate_report':
                if (reportGenerator.generatePDFReport) reportGenerator.generatePDFReport();
                break;
        }
    }

    updateNotificationBadge(count) {
        const badge = document.getElementById('notification-count');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
                badge.classList.add('pulse');
            } else {
                badge.style.display = 'none';
            }
        }
    }

    initializeAIAssistant() {
        // Preload AI suggestions based on current context
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
        // Refresh network intelligence data
        if (networkIntel && networkIntel.refreshData) {
            networkIntel.refreshData();
        }
    }

    updateDashboardWidgets() {
        // Update all dashboard widgets with real-time data
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
        this.showOfflineIndicator();
    }

    cleanup() {
        // Clean up all real-time listeners
        this.realtimeListeners.forEach(({ ref, listener }) => {
            if (ref && listener) {
                ref.off('value', listener);
            }
        });
        
        // Close WebSocket connection
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
        
        // Stop monitoring
        if (monitoringManager && monitoringManager.stopMonitoring) {
            monitoringManager.stopMonitoring();
        }
        
        // Save user preferences
        this.saveUserPreferences();
        
        // Log session end
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
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
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

// Add custom styles for new components
const style = document.createElement('style');
style.textContent = `
    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
    }
    
    .empty-state i {
        font-size: 64px;
        margin-bottom: 20px;
        opacity: 0.5;
    }
    
    .empty-state h3 {
        font-size: 20px;
        margin-bottom: 10px;
    }
    
    .device-type-badge {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .type-router { background: rgba(255, 107, 107, 0.2); color: #ff6b6b; }
    .type-switch { background: rgba(78, 205, 196, 0.2); color: #4ecdc4; }
    .type-firewall { background: rgba(255, 217, 61, 0.2); color: #ffd93d; }
    .type-server { background: rgba(108, 92, 231, 0.2); color: #6c5ce7; }
    .type-client { background: rgba(168, 230, 207, 0.2); color: #a8e6cf; }
    
    .action-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 5px 10px;
        transition: all 0.3s ease;
    }
    
    .action-btn:hover {
        color: var(--primary-color);
        transform: scale(1.1);
    }
    
    .form-group {
        margin-bottom: 15px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 5px;
        font-size: 14px;
        font-weight: 500;
    }
    
    .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--glass-border);
    }
    
    .detail-label {
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .detail-value {
        color: var(--text-primary);
    }
    
    .preview-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
    }
    
    .preview-table th,
    .preview-table td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid var(--glass-border);
    }
    
    .result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
        margin-top: 10px;
    }
    
    .result-item {
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
    }
    
    .result-item strong {
        display: block;
        font-size: 11px;
        color: var(--text-secondary);
        margin-bottom: 4px;
    }
    
    .result-item span {
        font-size: 13px;
        font-weight: 500;
        word-break: break-all;
    }
    
    .loading-spinner {
        text-align: center;
        padding: 20px;
        color: var(--text-secondary);
    }
    
    .error-message {
        color: var(--danger-color);
        padding: 10px;
        background: rgba(255, 71, 87, 0.1);
        border-radius: 6px;
        text-align: center;
    }
    
    .info-message {
        color: var(--primary-color);
        padding: 10px;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 6px;
        text-align: center;
    }
    
    .security-event {
        display: flex;
        gap: 15px;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 0.05);
    }
    
    .severity-critical { border-left: 3px solid #ff4757; }
    .severity-high { border-left: 3px solid #ff6b6b; }
    .severity-medium { border-left: 3px solid #ffd93d; }
    .severity-low { border-left: 3px solid #00ff9d; }
    
    .event-icon i {
        font-size: 20px;
    }
    
    .event-details {
        flex: 1;
    }
    
    .event-details p {
        margin: 5px 0;
        font-size: 13px;
        color: var(--text-secondary);
    }
    
    .event-details small {
        font-size: 11px;
        color: var(--text-secondary);
    }
    
    .security-score {
        margin: 15px 0;
    }
    
    .score-bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin: 10px 0;
    }
    
    .score-fill {
        height: 100%;
        background: linear-gradient(90deg, #00ff9d, #00d4ff);
        transition: width 0.5s ease;
    }
    
    .alert-critical {
        padding: 10px;
        background: rgba(255, 71, 87, 0.2);
        border-radius: 6px;
        color: #ff4757;
        margin-top: 10px;
    }
    
    .alert-warning {
        padding: 10px;
        background: rgba(255, 217, 61, 0.2);
        border-radius: 6px;
        color: #ffd93d;
    }
    
    .alert-success {
        padding: 10px;
        background: rgba(0, 255, 157, 0.2);
        border-radius: 6px;
        color: #00ff9d;
    }
    
    .recommendations ul {
        margin: 10px 0 0 20px;
        font-size: 13px;
        color: var(--text-secondary);
    }
    
    .typing-indicator .message-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .typing-dots {
        display: flex;
        gap: 4px;
    }
    
    .typing-dots span {
        width: 8px;
        height: 8px;
        background: var(--primary-color);
        border-radius: 50%;
        animation: typing 1.4s infinite;
    }
    
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-10px); opacity: 1; }
    }
    
    .typing-text {
        font-size: 12px;
        color: var(--text-secondary);
    }
    
    .copy-message-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .message:hover .copy-message-btn {
        opacity: 1;
    }
    
    .copy-message-btn:hover {
        color: var(--primary-color);
    }
    
    .voice-command-btn {
        position: absolute;
        right: 70px;
        bottom: 25px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        border: none;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
    }
    
    .voice-command-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
    }
    
    .drag-over {
        border: 2px dashed var(--primary-color);
        background: rgba(0, 212, 255, 0.1);
    }
    
    .error-page {
        text-align: center;
        padding: 60px 20px;
        margin: 20px;
    }
    
    .toast-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
        margin-left: 10px;
        opacity: 0.5;
    }
    
    .toast-close:hover {
        opacity: 1;
    }
    
    .notification-actions {
        display: flex;
        gap: 8px;
    }
    
    .badge {
        display: inline-block;
        padding: 0.25em 0.6em;
        font-size: 0.75em;
        font-weight: 700;
        line-height: 1;
        text-align: center;
        white-space: nowrap;
        vertical-align: baseline;
        border-radius: 10rem;
    }
    
    .bg-primary {
        background: var(--primary-color);
        color: #000;
    }
    
    .health-status {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .status-excellent {
        background: rgba(0, 255, 157, 0.2);
        color: #00ff9d;
    }
    
    .status-degraded {
        background: rgba(255, 217, 61, 0.2);
        color: #ffd93d;
    }
    
    .status-warning {
        background: rgba(255, 107, 107, 0.2);
        color: #ff6b6b;
    }
    
    .status-critical {
        background: rgba(255, 71, 87, 0.2);
        color: #ff4757;
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
    
    @keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.7);
        }
        70% {
            box-shadow: 0 0 0 10px rgba(0, 212, 255, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(0, 212, 255, 0);
        }
    }
    
    .pulse {
        animation: pulse 2s infinite;
    }
`;

document.head.appendChild(style);