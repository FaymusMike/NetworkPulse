// js/components/dashboard.js - COMPLETE with all features + fixes
import { db, rtdb } from '../config/firebase-config.js';
import { authManager } from '../auth/auth.js';

class DashboardManager {
    constructor() {
        this.trafficChart = null;
        this.alertCount = 0;
        this.updateInterval = null;
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
            const devicesSnapshot = await db.collection('devices').get();
            const activeCount = devicesSnapshot.docs.filter(d => d.data().status === 'active').length;
            
            const activeDevicesEl = document.getElementById('active-devices-count');
            if (activeDevicesEl) {
                const oldValue = parseInt(activeDevicesEl.textContent) || 0;
                activeDevicesEl.textContent = activeCount;
                
                // Animate if value changed
                if (oldValue !== activeCount) {
                    gsap.from(activeDevicesEl, {
                        scale: 1.2,
                        duration: 0.3,
                        ease: 'backOut'
                    });
                }
            }
        } catch (error) {
            console.error('Error loading active devices:', error);
            const activeDevicesEl = document.getElementById('active-devices-count');
            if (activeDevicesEl) activeDevicesEl.textContent = '0';
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
                    
                    if (healthEl) {
                        const oldValue = parseInt(healthEl.textContent) || 98;
                        const newValue = status.healthScore || 98;
                        healthEl.textContent = `${newValue}%`;
                        
                        // Animate health score change
                        if (oldValue !== newValue) {
                            gsap.from(healthEl, {
                                scale: 1.2,
                                duration: 0.3,
                                onComplete: () => {
                                    if (newValue < 60) {
                                        healthEl.style.color = '#ff4757';
                                    } else if (newValue < 80) {
                                        healthEl.style.color = '#ffd93d';
                                    } else {
                                        healthEl.style.color = '#00ff9d';
                                    }
                                }
                            });
                        }
                    }
                    
                    if (healthStatusEl) {
                        healthStatusEl.textContent = status.healthStatus || 'Excellent';
                        healthStatusEl.className = `health-status status-${(status.healthStatus || 'excellent').toLowerCase()}`;
                    }
                }
            }, (error) => {
                console.error('Network health listener error:', error);
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
                    alertList.innerHTML = `
                        <div class="alert-item info">
                            <i class="fas fa-check-circle"></i>
                            <div>
                                <strong>All Systems Operational</strong>
                                <p>No active alerts. Network is healthy.</p>
                            </div>
                        </div>
                    `;
                } else {
                    alertList.innerHTML = '';
                    alertsSnapshot.forEach(doc => {
                        const alert = doc.data();
                        const alertDiv = document.createElement('div');
                        alertDiv.className = `alert-item ${alert.severity || 'info'}`;
                        alertDiv.innerHTML = `
                            <i class="fas ${this.getAlertIcon(alert.severity)}"></i>
                            <div>
                                <strong>${this.escapeHtml(alert.title || 'Alert')}</strong>
                                <p>${this.escapeHtml(alert.message || 'No details')}</p>
                                <small>${alert.timestamp ? new Date(alert.timestamp.toDate()).toLocaleString() : 'Just now'}</small>
                            </div>
                        `;
                        alertList.appendChild(alertDiv);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading alerts:', error);
            const alertList = document.getElementById('alert-list');
            if (alertList) {
                alertList.innerHTML = `
                    <div class="alert-item warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Unable to Load Alerts</strong>
                            <p>Please check your connection and refresh the page.</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getAlertIcon(severity) {
        const icons = {
            'critical': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle',
            'success': 'fa-check-circle'
        };
        return icons[severity] || 'fa-bell';
    }

    initializeTrafficChart() {
        const ctx = document.getElementById('traffic-chart');
        if (!ctx) return;
        
        this.trafficChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 20}, (_, i) => `${20 - i}s ago`),
                datasets: [{
                    label: 'Traffic (Mbps)',
                    data: Array(20).fill(0).map(() => Math.random() * 100 + 50),
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#00d4ff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 0
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        labels: { 
                            color: '#fff',
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#00d4ff',
                        bodyColor: '#fff'
                    }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#fff' },
                        title: {
                            display: true,
                            text: 'Mbps',
                            color: '#fff'
                        }
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
        if (this.updateInterval) clearInterval(this.updateInterval);
        
        this.updateInterval = setInterval(() => {
            if (this.trafficChart) {
                const newData = [...this.trafficChart.data.datasets[0].data.slice(1), Math.random() * 100 + 50];
                this.trafficChart.data.datasets[0].data = newData;
                this.trafficChart.update('none');
            }
        }, 2000);
    }

    setupRealTimeListeners() {
        // Listen for device status changes
        try {
            rtdb.ref('deviceUpdates').on('child_changed', (snapshot) => {
                this.loadActiveDevices();
                this.showToast(`Device ${snapshot.key} status changed`, 'info');
            });
        } catch (error) {
            console.error('Device updates listener error:', error);
        }
        
        // Listen for new alerts with error handling
        try {
            db.collection('alerts')
                .where('resolved', '==', false)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const alert = change.doc.data();
                            this.showToast(alert.message || alert.title, alert.severity || 'info');
                            this.updateNotificationBadge();
                        }
                    });
                    this.loadAlerts();
                }, (error) => {
                    console.error('Alerts snapshot error:', error);
                });
        } catch (error) {
            console.error('Alerts listener setup error:', error);
        }
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
                repeat: 1,
                onComplete: () => {
                    badge.classList.add('pulse');
                }
            });
            
            // Reset pulse after 2 seconds
            setTimeout(() => {
                badge.classList.remove('pulse');
            }, 2000);
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
            <span>${this.escapeHtml(message)}</span>
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

export const dashboardManager = new DashboardManager();