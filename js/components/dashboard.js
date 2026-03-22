import { db, rtdb } from '../config/firebase-config.js';
import { authManager } from '../auth/auth.js';

class DashboardManager {
    constructor() {
        this.trafficChart = null;
        this.alertCount = 0;
        this.setupRealTimeListeners();
    }

    initialize() {
        this.loadWidgetData();
        this.initializeTrafficChart();
        this.startSimulatedUpdates();
    }

    async loadWidgetData() {
        await this.loadActiveDevices();
        await this.loadNetworkHealth();
        await this.loadAlerts();
    }

    async loadActiveDevices() {
        try {
            const devicesSnapshot = await db.collection('devices').where('status', '==', 'active').get();
            const activeCount = devicesSnapshot.size;
            
            const activeDevicesEl = document.getElementById('active-devices-count');
            if (activeDevicesEl) {
                activeDevicesEl.textContent = activeCount;
                gsap.from(activeDevicesEl, {
                    textContent: 0,
                    duration: 1,
                    snap: { textContent: 1 },
                    stagger: 1
                });
            }
        } catch (error) {
            console.error('Error loading active devices:', error);
        }
    }

    async loadNetworkHealth() {
        try {
            const statusRef = rtdb.ref('networkStatus');
            statusRef.on('value', (snapshot) => {
                const status = snapshot.val();
                if (status) {
                    const healthEl = document.getElementById('network-health');
                    const healthStatusEl = document.getElementById('health-status');
                    
                    if (healthEl) healthEl.textContent = `${status.healthScore}%`;
                    if (healthStatusEl) {
                        healthStatusEl.textContent = status.healthStatus;
                        healthStatusEl.className = `health-status status-${status.healthStatus.toLowerCase()}`;
                    }
                }
            });
        } catch (error) {
            console.error('Error loading network health:', error);
        }
    }

    async loadAlerts() {
        try {
            const alertsSnapshot = await db.collection('alerts')
                .where('resolved', '==', false)
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get();
            
            const alertList = document.getElementById('alert-list');
            if (alertList) {
                if (alertsSnapshot.empty) {
                    alertList.innerHTML = '<div class="alert-item info">✓ No active alerts. Network is healthy.</div>';
                } else {
                    alertList.innerHTML = '';
                    alertsSnapshot.forEach(doc => {
                        const alert = doc.data();
                        const alertDiv = document.createElement('div');
                        alertDiv.className = `alert-item ${alert.severity}`;
                        alertDiv.innerHTML = `
                            <i class="fas ${this.getAlertIcon(alert.severity)}"></i>
                            <div>
                                <strong>${alert.title}</strong>
                                <p>${alert.message}</p>
                                <small>${new Date(alert.timestamp).toLocaleString()}</small>
                            </div>
                        `;
                        alertList.appendChild(alertDiv);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    }

    getAlertIcon(severity) {
        const icons = {
            'critical': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[severity] || 'fa-bell';
    }

    initializeTrafficChart() {
        const ctx = document.getElementById('traffic-chart');
        if (!ctx) return;
        
        this.trafficChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 20}, (_, i) => `${i}s ago`),
                datasets: [{
                    label: 'Traffic (Mbps)',
                    data: Array(20).fill(0),
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#fff' }
                    }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#fff' }
                    },
                    x: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#fff' }
                    }
                }
            }
        });
    }

    startSimulatedUpdates() {
        setInterval(() => {
            if (this.trafficChart) {
                const newData = [...this.trafficChart.data.datasets[0].data.slice(1), Math.random() * 100 + 50];
                this.trafficChart.data.datasets[0].data = newData;
                this.trafficChart.update('none');
            }
        }, 2000);
    }

    setupRealTimeListeners() {
        // Listen for device status changes
        rtdb.ref('deviceUpdates').on('child_changed', (snapshot) => {
            this.loadActiveDevices();
            this.showToast(`Device ${snapshot.key} status changed`, 'info');
        });
        
        // Listen for new alerts
        db.collection('alerts')
            .where('resolved', '==', false)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const alert = change.doc.data();
                        this.showToast(alert.message, alert.severity);
                        this.updateNotificationBadge();
                    }
                });
                this.loadAlerts();
            });
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notification-count');
        if (badge) {
            this.alertCount++;
            badge.textContent = this.alertCount;
            badge.style.display = 'block';
            
            // Animate badge
            gsap.to(badge, {
                scale: 1.2,
                duration: 0.2,
                yoyo: true,
                repeat: 1
            });
        }
    }

    refresh() {
        this.loadWidgetData();
        this.loadAlerts();
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'critical' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

export const dashboardManager = new DashboardManager();