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
        this.setupEventListeners();
        this.setupNavigation();
        this.setupThemeToggle();
        this.initializeComponents();
    }

    setupEventListeners() {
        // Auth form handling
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const googleLogin = document.getElementById('google-login');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                authManager.loginWithEmail(email, password);
            });
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('signup-name').value;
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                const role = document.getElementById('signup-role').value;
                authManager.signupWithEmail(name, email, password, role);
            });
        }
        
        if (googleLogin) {
            googleLogin.addEventListener('click', () => {
                authManager.loginWithGoogle();
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                authManager.logout();
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
                if (form) form.classList.add('active');
            });
        });

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.toggle('mobile-open');
            });
        }

        // Notification bell
        const notificationBell = document.getElementById('notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotifications();
            });
        }
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
        // Update active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
        
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) targetPage.classList.add('active');
        
        this.currentPage = page;
        
        // Initialize page-specific components
        switch(page) {
            case 'topology':
                setTimeout(() => topologyManager.initialize(), 100);
                break;
            case 'dashboard':
                dashboardManager.refresh();
                break;
            case 'devices':
                deviceManager.loadDevices();
                break;
            case 'monitoring':
                monitoringManager.startMonitoring();
                break;
            case 'security':
                securityInsights.loadSecurityDashboard();
                break;
            case 'network-intel':
                // Already initialized
                break;
        }
        
        // Animate page transition
        gsap.from(`#${page}-page`, {
            opacity: 0,
            y: 20,
            duration: 0.4,
            ease: 'power2.out'
        });
        
        // Close mobile menu if open
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.classList.add(`${savedTheme}-mode`);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark-mode');
                document.body.classList.remove(isDark ? 'dark-mode' : 'light-mode');
                document.body.classList.add(isDark ? 'light-mode' : 'dark-mode');
                localStorage.setItem('theme', isDark ? 'light' : 'dark');
                
                // Animate theme change
                gsap.to('body', {
                    duration: 0.3,
                    opacity: 0.95,
                    yoyo: true,
                    repeat: 1
                });
            });
        }
    }

    initializeComponents() {
        window.addEventListener('userLoggedIn', (event) => {
            const { role } = event.detail;
            this.updateUIForRole(role);
            this.startRealTimeUpdates();
            
            // Initialize all components
            dashboardManager.initialize();
            deviceManager.initialize();
            monitoringManager.initialize();
            securityInsights.initialize();
            reportGenerator.initialize();
            
            // Load initial data
            deviceManager.loadDevices();
            dashboardManager.refresh();
            
            // Show welcome toast
            setTimeout(() => {
                authManager.showToast(`Welcome to NetworkPulse, ${event.detail.user.displayName || 'User'}!`, 'success');
            }, 500);
        });
        
        // Handle window unload
        window.addEventListener('beforeunload', () => {
            monitoringManager.stopMonitoring();
        });
    }

    updateUIForRole(role) {
        // Hide admin-only features for non-admin users
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        const isAdmin = role === 'admin';
        
        adminOnlyElements.forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });
        
        // Network engineer permissions
        if (role === 'network-engineer' || role === 'admin') {
            document.querySelectorAll('.engineer-only').forEach(el => {
                el.style.display = 'block';
            });
        }
    }

    startRealTimeUpdates() {
        // Listen for real-time network updates
        const networkStatusRef = firebase.database().ref('networkStatus');
        networkStatusRef.on('value', (snapshot) => {
            const status = snapshot.val();
            if (status) {
                this.updateNetworkStatus(status);
            }
        });
        
        // Check connection status periodically
        setInterval(() => {
            this.updateConnectionStatus();
        }, 5000);
    }

    updateNetworkStatus(status) {
        const healthScore = document.getElementById('network-health');
        if (healthScore) {
            healthScore.textContent = `${status.healthScore}%`;
        }
        
        const healthStatus = document.getElementById('health-status');
        if (healthStatus) {
            healthStatus.textContent = status.healthStatus;
        }
    }

    updateConnectionStatus() {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            if (navigator.onLine) {
                statusEl.classList.remove('offline');
                statusEl.innerHTML = '<i class="fas fa-wifi"></i> Online';
            } else {
                statusEl.classList.add('offline');
                statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
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
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content glass-effect">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-bell"></i> Notifications
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${notifications.empty ? 
                                '<div class="empty-notifications">No notifications yet</div>' :
                                notifications.docs.map(doc => {
                                    const n = doc.data();
                                    return `
                                        <div class="notification-item ${n.read ? 'read' : 'unread'}">
                                            <div class="notification-icon">
                                                <i class="fas ${n.icon || 'fa-bell'}"></i>
                                            </div>
                                            <div class="notification-content">
                                                <strong>${n.title}</strong>
                                                <p>${n.message}</p>
                                                <small>${new Date(n.timestamp?.toDate()).toLocaleString()}</small>
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
            
            // Mark notifications as read
            if (!notifications.empty) {
                const batch = db.batch();
                notifications.forEach(doc => {
                    batch.update(doc.ref, { read: true });
                });
                await batch.commit();
                
                const badge = document.getElementById('notification-count');
                if (badge) {
                    badge.textContent = '0';
                    badge.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

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
`;

document.head.appendChild(style);