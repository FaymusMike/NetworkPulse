// js/components/monitoring.js - COMPLETE FIXED VERSION
import { db, rtdb } from '../config/firebase-config.js';
import { offlineSync } from '../utils/offline-sync.js';
import { authManager } from '../auth/auth.js';

class MonitoringManager {
    constructor() {
        this.bandwidthChart = null;
        this.latencyChart = null;
        this.packetLossChart = null;
        this.metrics = { bandwidth: [], latency: [], packetLoss: [] };
        this.updateInterval = null;
        this.isLocalUpdate = false;
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        // Check if chart canvases exist
        const bandwidthCanvas = document.getElementById('bandwidth-chart');
        const latencyCanvas = document.getElementById('latency-chart');
        const packetLossCanvas = document.getElementById('packet-loss-chart');
        
        if (!bandwidthCanvas || !latencyCanvas || !packetLossCanvas) {
            console.error('[Monitoring] Chart canvases not found');
            return;
        }
        
        this.initializeCharts();
        this.loadHistoricalMetrics();
        this.startMonitoring();
    }

    initializeCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 0 },
            plugins: {
                legend: { labels: { color: '#fff', font: { size: 12 } } },
                tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#00d4ff', bodyColor: '#fff' }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } }
            }
        };
        
        // Bandwidth Chart
        const bandwidthCtx = document.getElementById('bandwidth-chart');
        if (bandwidthCtx) {
            if (this.bandwidthChart) this.bandwidthChart.destroy();
            this.bandwidthChart = new Chart(bandwidthCtx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Bandwidth (Mbps)', data: [], borderColor: '#00d4ff', backgroundColor: 'rgba(0, 212, 255, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6 }] },
                options: chartOptions
            });
        }
        
        // Latency Chart
        const latencyCtx = document.getElementById('latency-chart');
        if (latencyCtx) {
            if (this.latencyChart) this.latencyChart.destroy();
            this.latencyChart = new Chart(latencyCtx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Latency (ms)', data: [], borderColor: '#ffd93d', backgroundColor: 'rgba(255, 217, 61, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6 }] },
                options: chartOptions
            });
        }
        
        // Packet Loss Chart
        const packetLossCtx = document.getElementById('packet-loss-chart');
        if (packetLossCtx) {
            if (this.packetLossChart) this.packetLossChart.destroy();
            this.packetLossChart = new Chart(packetLossCtx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Packet Loss (%)', data: [], borderColor: '#ff4757', backgroundColor: 'rgba(255, 71, 87, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6 }] },
                options: chartOptions
            });
        }
    }

    async loadHistoricalMetrics() {
        try {
            const metricsRef = rtdb.ref('metrics');
            const snapshot = await metricsRef.get();
            const data = snapshot.val();
            
            if (data) {
                this.metrics = {
                    bandwidth: data.bandwidth || [],
                    latency: data.latency || [],
                    packetLoss: data.packetLoss || []
                };
                const maxPoints = 60;
                Object.keys(this.metrics).forEach(key => {
                    if (this.metrics[key].length > maxPoints) this.metrics[key] = this.metrics[key].slice(-maxPoints);
                });
                this.updateCharts();
            }
        } catch (error) {
            console.error('[Monitoring] Error loading historical metrics:', error);
        }
    }

    startMonitoring() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        
        this.updateInterval = setInterval(() => {
            this.generateMetrics();
            this.updateRealtimeDatabase();
            this.updateCharts();
        }, 2000);
        
        rtdb.ref('metrics').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && !this.isLocalUpdate) {
                this.metrics = { bandwidth: data.bandwidth || [], latency: data.latency || [], packetLoss: data.packetLoss || [] };
                this.updateCharts();
            }
            this.isLocalUpdate = false;
        });
    }

    generateMetrics() {
        const timestamp = new Date().toLocaleTimeString();
        let bandwidth = Math.random() * 100 + 50;
        if (Math.random() < 0.05) bandwidth += Math.random() * 200;
        let latency = 10 + (bandwidth / 150) * 40 + Math.random() * 10;
        let packetLoss = Math.random() * 2;
        if (latency > 60) packetLoss += Math.random() * 5;
        
        this.metrics.bandwidth.push({ x: timestamp, y: Math.min(bandwidth, 300) });
        this.metrics.latency.push({ x: timestamp, y: Math.min(latency, 150) });
        this.metrics.packetLoss.push({ x: timestamp, y: Math.min(packetLoss, 10) });
        
        const maxPoints = 60;
        Object.keys(this.metrics).forEach(key => {
            if (this.metrics[key].length > maxPoints) this.metrics[key] = this.metrics[key].slice(-maxPoints);
        });
        
        this.checkAnomalies(bandwidth, latency, packetLoss);
    }

    async updateRealtimeDatabase() {
        this.isLocalUpdate = true;
        try {
            await rtdb.ref('metrics').set({
                bandwidth: this.metrics.bandwidth,
                latency: this.metrics.latency,
                packetLoss: this.metrics.packetLoss,
                lastUpdated: Date.now()
            });
            if (!navigator.onLine) await offlineSync.saveMetricsOffline({ bandwidth: this.metrics.bandwidth, latency: this.metrics.latency, packetLoss: this.metrics.packetLoss });
        } catch (error) {
            console.error('[Monitoring] Error updating metrics:', error);
        }
    }

    updateCharts() {
        if (this.bandwidthChart && this.metrics.bandwidth.length > 0) {
            this.bandwidthChart.data.labels = this.metrics.bandwidth.map(m => m.x);
            this.bandwidthChart.data.datasets[0].data = this.metrics.bandwidth.map(m => m.y);
            this.bandwidthChart.update('none');
        }
        if (this.latencyChart && this.metrics.latency.length > 0) {
            this.latencyChart.data.labels = this.metrics.latency.map(m => m.x);
            this.latencyChart.data.datasets[0].data = this.metrics.latency.map(m => m.y);
            this.latencyChart.update('none');
        }
        if (this.packetLossChart && this.metrics.packetLoss.length > 0) {
            this.packetLossChart.data.labels = this.metrics.packetLoss.map(m => m.x);
            this.packetLossChart.data.datasets[0].data = this.metrics.packetLoss.map(m => m.y);
            this.packetLossChart.update('none');
        }
    }

    checkAnomalies(bandwidth, latency, packetLoss) {
        if (bandwidth > 250) this.createAlert('critical', 'High Bandwidth Usage', `Bandwidth usage is at ${Math.round(bandwidth)} Mbps, approaching network capacity.`);
        else if (latency > 100) this.createAlert('warning', 'High Latency Detected', `Network latency is at ${Math.round(latency)} ms, affecting performance.`);
        else if (packetLoss > 5) this.createAlert('critical', 'Packet Loss Detected', `Packet loss is at ${packetLoss.toFixed(1)}%, indicating network issues.`);
        this.updateNetworkHealth(bandwidth, latency, packetLoss);
    }

    async createAlert(severity, title, message) {
        try {
            if (typeof db !== 'undefined' && db) {
                await db.collection('alerts').add({
                    title, message, severity,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    resolved: false
                });
            }
            this.showToast(message, severity);
            const badge = document.getElementById('notification-count');
            if (badge) {
                const currentCount = parseInt(badge.textContent) || 0;
                badge.textContent = currentCount + 1;
                badge.style.display = 'block';
            }
        } catch (error) {
            console.error('[Monitoring] Error creating alert:', error);
            this.showToast(message, severity);
        }
    }

    async updateNetworkHealth(bandwidth, latency, packetLoss) {
        try {
            let healthScore = 100;
            if (bandwidth > 250) healthScore -= 20;
            if (latency > 100) healthScore -= 15;
            if (packetLoss > 5) healthScore -= 25;
            healthScore = Math.max(healthScore, 0);
            
            let healthStatus = 'Excellent';
            if (healthScore < 60) healthStatus = 'Critical';
            else if (healthScore < 80) healthStatus = 'Warning';
            else if (healthScore < 95) healthStatus = 'Degraded';
            
            await rtdb.ref('networkStatus').update({
                healthScore, healthStatus, lastUpdated: Date.now(),
                metrics: { bandwidth: Math.round(bandwidth), latency: Math.round(latency), packetLoss: packetLoss.toFixed(1) }
            });
        } catch (error) {
            console.error('[Monitoring] Error updating network health:', error);
        }
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${type === 'critical' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i><span>${message}</span><button class="toast-close">&times;</button>`;
        toast.querySelector('.toast-close').onclick = () => toast.remove();
        toastContainer.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
    }

    stopMonitoring() {
        if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
    }
}

export const monitoringManager = new MonitoringManager();