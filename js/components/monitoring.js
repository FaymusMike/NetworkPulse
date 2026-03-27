// js/components/monitoring.js - COMPLETE FIXED VERSION with all features preserved
import { db, rtdb } from '../config/firebase-config.js';
import { offlineSync } from '../utils/offline-sync.js';
import { authManager } from '../auth/auth.js';

class MonitoringManager {
    constructor() {
        this.bandwidthChart = null;
        this.latencyChart = null;
        this.packetLossChart = null;
        this.metrics = {
            bandwidth: [],
            latency: [],
            packetLoss: []
        };
        this.updateInterval = null;
        this.isLocalUpdate = false;
    }

    initialize() {
        this.initializeCharts();
        this.loadHistoricalMetrics();
        this.startMonitoring();
    }

    initializeCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 0
            },
            plugins: {
                legend: {
                    labels: { color: '#fff', font: { size: 12 } }
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
                    ticks: { color: '#fff' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#fff' }
                }
            }
        };
        
        // Bandwidth Chart (Mbps)
        const bandwidthCtx = document.getElementById('bandwidth-chart');
        if (bandwidthCtx) {
            if (this.bandwidthChart) {
                this.bandwidthChart.destroy();
            }
            this.bandwidthChart = new Chart(bandwidthCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Bandwidth (Mbps)',
                        data: [],
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 6
                    }]
                },
                options: chartOptions
            });
        }
        
        // Latency Chart (ms)
        const latencyCtx = document.getElementById('latency-chart');
        if (latencyCtx) {
            if (this.latencyChart) {
                this.latencyChart.destroy();
            }
            this.latencyChart = new Chart(latencyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Latency (ms)',
                        data: [],
                        borderColor: '#ffd93d',
                        backgroundColor: 'rgba(255, 217, 61, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 6
                    }]
                },
                options: chartOptions
            });
        }
        
        // Packet Loss Chart (%)
        const packetLossCtx = document.getElementById('packet-loss-chart');
        if (packetLossCtx) {
            if (this.packetLossChart) {
                this.packetLossChart.destroy();
            }
            this.packetLossChart = new Chart(packetLossCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Packet Loss (%)',
                        data: [],
                        borderColor: '#ff4757',
                        backgroundColor: 'rgba(255, 71, 87, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 6
                    }]
                },
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
                
                // Keep only last 60 data points
                const maxPoints = 60;
                Object.keys(this.metrics).forEach(key => {
                    if (this.metrics[key].length > maxPoints) {
                        this.metrics[key] = this.metrics[key].slice(-maxPoints);
                    }
                });
                
                this.updateCharts();
            }
        } catch (error) {
            console.error('Error loading historical metrics:', error);
        }
    }

    startMonitoring() {
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Update every 2 seconds
        this.updateInterval = setInterval(() => {
            this.generateMetrics();
            this.updateRealtimeDatabase();
            this.updateCharts();
        }, 2000);
        
        // Listen for real-time updates from other clients
        rtdb.ref('metrics').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && !this.isLocalUpdate) {
                this.metrics = {
                    bandwidth: data.bandwidth || [],
                    latency: data.latency || [],
                    packetLoss: data.packetLoss || []
                };
                this.updateCharts();
            }
            this.isLocalUpdate = false;
        });
    }

    generateMetrics() {
        // Simulate realistic network metrics with occasional spikes
        const timestamp = new Date().toLocaleTimeString();
        
        // Bandwidth: between 50 and 150 Mbps, occasional spikes
        let bandwidth = Math.random() * 100 + 50;
        if (Math.random() < 0.05) { // 5% chance of spike
            bandwidth += Math.random() * 200;
        }
        
        // Latency: between 10 and 50 ms, higher during high bandwidth
        let latency = 10 + (bandwidth / 150) * 40 + Math.random() * 10;
        
        // Packet loss: normally 0-2%, higher during high latency
        let packetLoss = Math.random() * 2;
        if (latency > 60) {
            packetLoss += Math.random() * 5;
        }
        
        // Add to metrics arrays
        this.metrics.bandwidth.push({ x: timestamp, y: Math.min(bandwidth, 300) });
        this.metrics.latency.push({ x: timestamp, y: Math.min(latency, 150) });
        this.metrics.packetLoss.push({ x: timestamp, y: Math.min(packetLoss, 10) });
        
        // Keep only last 60 points
        const maxPoints = 60;
        Object.keys(this.metrics).forEach(key => {
            if (this.metrics[key].length > maxPoints) {
                this.metrics[key] = this.metrics[key].slice(-maxPoints);
            }
        });
        
        // Check for anomalies
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
            
            // Cache metrics if offline
            if (!navigator.onLine) {
                await offlineSync.saveMetricsOffline({
                    bandwidth: this.metrics.bandwidth,
                    latency: this.metrics.latency,
                    packetLoss: this.metrics.packetLoss
                });
            }
        } catch (error) {
            console.error('Error updating metrics:', error);
        }
    }

    updateCharts() {
        if (this.bandwidthChart && this.metrics.bandwidth.length > 0) {
            const labels = this.metrics.bandwidth.map(m => m.x);
            const data = this.metrics.bandwidth.map(m => m.y);
            
            this.bandwidthChart.data.labels = labels;
            this.bandwidthChart.data.datasets[0].data = data;
            this.bandwidthChart.update('none');
        }
        
        if (this.latencyChart && this.metrics.latency.length > 0) {
            const labels = this.metrics.latency.map(m => m.x);
            const data = this.metrics.latency.map(m => m.y);
            
            this.latencyChart.data.labels = labels;
            this.latencyChart.data.datasets[0].data = data;
            this.latencyChart.update('none');
        }
        
        if (this.packetLossChart && this.metrics.packetLoss.length > 0) {
            const labels = this.metrics.packetLoss.map(m => m.x);
            const data = this.metrics.packetLoss.map(m => m.y);
            
            this.packetLossChart.data.labels = labels;
            this.packetLossChart.data.datasets[0].data = data;
            this.packetLossChart.update('none');
        }
    }

    checkAnomalies(bandwidth, latency, packetLoss) {
        // Check for critical anomalies
        if (bandwidth > 250) {
            this.createAlert('critical', 'High Bandwidth Usage', `Bandwidth usage is at ${Math.round(bandwidth)} Mbps, approaching network capacity.`);
        } else if (latency > 100) {
            this.createAlert('warning', 'High Latency Detected', `Network latency is at ${Math.round(latency)} ms, affecting performance.`);
        } else if (packetLoss > 5) {
            this.createAlert('critical', 'Packet Loss Detected', `Packet loss is at ${packetLoss.toFixed(1)}%, indicating network issues.`);
        }
        
        // Update network health
        this.updateNetworkHealth(bandwidth, latency, packetLoss);
    }

    async createAlert(severity, title, message) {
        try {
            // Check if db is available
            if (!db) {
                console.error('Firestore db not available');
                return;
            }
            
            const alertRef = await db.collection('alerts').add({
                title: title,
                message: message,
                severity: severity,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                resolved: false
            });
            
            // Show notification
            this.showToast(message, severity);
            
            // Update notification badge
            const badge = document.getElementById('notification-count');
            if (badge) {
                const currentCount = parseInt(badge.textContent) || 0;
                badge.textContent = currentCount + 1;
                badge.style.display = 'block';
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 2000);
            }
            
        } catch (error) {
            console.error('Error creating alert:', error);
        }
    }

    async updateNetworkHealth(bandwidth, latency, packetLoss) {
        try {
            // Calculate health score based on metrics
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
                healthScore: healthScore,
                healthStatus: healthStatus,
                lastUpdated: Date.now(),
                metrics: {
                    bandwidth: Math.round(bandwidth),
                    latency: Math.round(latency),
                    packetLoss: packetLoss.toFixed(1)
                }
            });
        } catch (error) {
            console.error('Error updating network health:', error);
        }
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'critical' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
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

    updateMetric(metric) {
        // Handle real-time metric updates from WebSocket
        if (metric.type === 'bandwidth') {
            this.metrics.bandwidth.push({ x: new Date().toLocaleTimeString(), y: metric.value });
            if (this.metrics.bandwidth.length > 60) this.metrics.bandwidth.shift();
        } else if (metric.type === 'latency') {
            this.metrics.latency.push({ x: new Date().toLocaleTimeString(), y: metric.value });
            if (this.metrics.latency.length > 60) this.metrics.latency.shift();
        } else if (metric.type === 'packetLoss') {
            this.metrics.packetLoss.push({ x: new Date().toLocaleTimeString(), y: metric.value });
            if (this.metrics.packetLoss.length > 60) this.metrics.packetLoss.shift();
        }
        this.updateCharts();
    }

    updateChartType(type) {
        // Update chart type based on user preference
        // This method is called from loadUserPreferences
        console.log('Chart type updated:', type);
        // Implementation for chart type change would go here
    }

    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

export const monitoringManager = new MonitoringManager();