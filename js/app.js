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
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            authManager.loginWithEmail(email, password);
        });

        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const role = document.getElementById('signup-role').value;
            authManager.signupWithEmail(name, email, password, role);
        });

        document.getElementById('google-login').addEventListener('click', () => {
            authManager.loginWithGoogle();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            authManager.logout();
        });

        // Auth tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${tabName}-form`).classList.add('active');
            });
        });

        // Mobile menu toggle
        document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('mobile-open');
        });

        // Notification bell
        document.getElementById('notification-bell').addEventListener('click', () => {
            this.showNotifications();
        });

        // Network intelligence lookups
        document.getElementById('lookup-ip').addEventListener('click', async () => {
            const ip = document.getElementById('ip-input').value;
            if (ip) {
                const result = await apiClients.getIPGeolocation(ip);
                document.getElementById('geo-result').innerHTML = `
                    <div class="result-card">
                        <p><strong>IP:</strong> ${result.ip}</p>
                        <p><strong>Location:</strong> ${result.city}, ${result.region}, ${result.country}</p>
                        <p><strong>Organization:</strong> ${result.org}</p>
                        <p><strong>Coordinates:</strong> ${result.location}</p>
                    </div>
                `;
            }
        });

        document.getElementById('lookup-dns').addEventListener('click', async () => {
            const domain = document.getElementById('domain-input').value;
            if (domain) {
                const records = await apiClients.dnsLookup(domain);
                document.getElementById('dns-result').innerHTML = `
                    <div class="result-card">
                        <p><strong>DNS Records for ${domain}:</strong></p>
                        ${records.map(record => `<p>→ ${record}</p>`).join('')}
                    </div>
                `;
            }
        });

        document.getElementById('lookup-whois').addEventListener('click', async () => {
            const domain = document.getElementById('whois-input').value;
            if (domain) {
                const info = await apiClients.whoisLookup(domain);
                document.getElementById('whois-result').innerHTML = `
                    <div class="result-card">
                        <p><strong>Registrar:</strong> ${info.registrar}</p>
                        <p><strong>Created:</strong> ${info.creationDate}</p>
                        <p><strong>Expires:</strong> ${info.expirationDate}</p>
                        <p><strong>Name Servers:</strong> ${info.nameServers?.join(', ')}</p>
                    </div>
                `;
            }
        });
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
        
        document.getElementById(`${page}-page`).classList.add('active');
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
                securityInsights.loadInsights();
                break;
        }
        
        // Animate page transition
        gsap.from(`#${page}-page`, {
            opacity: 0,
            y: 20,
            duration: 0.4
        });
        
        // Close mobile menu if open
        document.querySelector('.sidebar').classList.remove('mobile-open');
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.classList.add(`${savedTheme}-mode`);
        
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

    initializeComponents() {
        window.addEventListener('userLoggedIn', (event) => {
            const { role } = event.detail;
            this.updateUIForRole(role);
            this.startRealTimeUpdates();
            
            // Initialize default components
            dashboardManager.initialize();
            deviceManager.initialize();
            monitoringManager.initialize();
            securityInsights.initialize();
            reportGenerator.initialize();
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
        firebase.database().ref('networkStatus').on('value', (snapshot) => {
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
        if (navigator.onLine) {
            statusEl.classList.remove('offline');
            statusEl.innerHTML = '<i class="fas fa-wifi"></i> Online';
        } else {
            statusEl.classList.add('offline');
            statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
        }
    }

    showNotifications() {
        // Fetch recent notifications from Firestore
        db.collection('notifications')
            .where('userId', '==', authManager.currentUser?.uid)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get()
            .then((snapshot) => {
                const notifications = [];
                snapshot.forEach(doc => {
                    notifications.push(doc.data());
                });
                
                this.renderNotifications(notifications);
            });
    }

    renderNotifications(notifications) {
        const modal = `
            <div class="modal fade" id="notificationsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content glass-effect">
                        <div class="modal-header">
                            <h5 class="modal-title">Notifications</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${notifications.length === 0 ? 
                                '<p>No new notifications</p>' :
                                notifications.map(n => `
                                    <div class="notification-item">
                                        <i class="fas ${n.icon}"></i>
                                        <div>
                                            <strong>${n.title}</strong>
                                            <p>${n.message}</p>
                                            <small>${new Date(n.timestamp).toLocaleString()}</small>
                                        </div>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modal);
        const modalElement = new bootstrap.Modal(document.getElementById('notificationsModal'));
        modalElement.show();
        
        document.getElementById('notificationsModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('notificationsModal').remove();
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
});