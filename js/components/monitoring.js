import { rtdb } from '../config/firebase-config.js';
import { offlineSync } from '../utils/offline-sync.js';

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
            this.bandwidthChart = new Chart(bandwidthCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Bandwidth (Mbps)',
                        data: [],
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartOptions
            });
        }
        
        // Latency Chart (ms)
        const latencyCtx = document.getElementById('latency-chart');
        if (latencyCtx) {
            this.latencyChart = new Chart(latencyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Latency (ms)',
                        data: [],
                        borderColor: '#ffd93d',
                        backgroundColor: 'rgba(255, 217, 61, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartOptions
            });
        }
        
        // Packet Loss Chart (%)
        const packetLossCtx = document.getElementById('packet-loss-chart');
        if (packetLossCtx) {
            this.packetLossChart = new Chart(packetLossCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Packet Loss (%)',
                        data: [],
                        borderColor: '#ff4757',
                        backgroundColor: 'rgba(255, 71, 87, 0.1)',
                        tension: 0.4,
                        fill: true
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
        const alertRef = await db.collection('alerts').add({
            title: title,
            message: message,
            severity: severity,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            resolved: false
        });
        
        // Show notification
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${severity}`;
        toast.innerHTML = `
            <i class="fas ${severity === 'critical' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}"></i>
            <div>
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => toast.remove(), 5000);
    }

    async updateNetworkHealth(bandwidth, latency, packetLoss) {
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
    }

    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

export const monitoringManager = new MonitoringManager();