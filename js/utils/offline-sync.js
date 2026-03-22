class OfflineSync {
    constructor() {
        this.cacheKey = 'networkPlatformCache';
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('online', () => this.syncData());
        window.addEventListener('offline', () => this.showOfflineMode());
    }

    async cacheData(key, data) {
        const cache = this.getCache();
        cache[key] = {
            data: data,
            timestamp: Date.now(),
            synced: false
        };
        localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    }

    getCachedData(key) {
        const cache = this.getCache();
        if (cache[key] && this.isCacheValid(cache[key].timestamp)) {
            return cache[key].data;
        }
        return null;
    }

    getCache() {
        const cache = localStorage.getItem(this.cacheKey);
        return cache ? JSON.parse(cache) : {};
    }

    isCacheValid(timestamp) {
        // Cache valid for 24 hours
        return (Date.now() - timestamp) < 24 * 60 * 60 * 1000;
    }

    async syncData() {
        const cache = this.getCache();
        const unsyncedItems = Object.keys(cache).filter(key => !cache[key].synced);
        
        if (unsyncedItems.length > 0) {
            this.showToast('Syncing offline data...', 'info');
            
            for (const key of unsyncedItems) {
                try {
                    await this.syncToFirebase(key, cache[key].data);
                    cache[key].synced = true;
                } catch (error) {
                    console.error(`Failed to sync ${key}:`, error);
                }
            }
            
            localStorage.setItem(this.cacheKey, JSON.stringify(cache));
            this.showToast('Offline data synced successfully', 'success');
        }
    }

    async syncToFirebase(key, data) {
        switch(key) {
            case 'devices':
                const devicesRef = db.collection('devices');
                for (const device of data) {
                    if (device.id) {
                        await devicesRef.doc(device.id).set(device, { merge: true });
                    } else {
                        await devicesRef.add(device);
                    }
                }
                break;
            case 'networkMetrics':
                const metricsRef = rtdb.ref('metrics');
                await metricsRef.set(data);
                break;
            case 'securityEvents':
                const eventsRef = db.collection('securityEvents');
                for (const event of data) {
                    await eventsRef.add(event);
                }
                break;
            default:
                console.log('Unknown sync key:', key);
        }
    }

    showOfflineMode() {
        this.showToast('You are offline. Using cached data.', 'warning');
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.classList.add('offline');
            connectionStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
        }
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async saveDeviceOffline(device) {
        const devices = this.getCachedData('devices') || [];
        devices.push(device);
        await this.cacheData('devices', devices);
    }

    async saveMetricsOffline(metrics) {
        const cachedMetrics = this.getCachedData('networkMetrics') || [];
        cachedMetrics.push({
            ...metrics,
            timestamp: Date.now()
        });
        await this.cacheData('networkMetrics', cachedMetrics);
    }

    async saveSecurityEventOffline(event) {
        const events = this.getCachedData('securityEvents') || [];
        events.push(event);
        await this.cacheData('securityEvents', events);
    }
}

export const offlineSync = new OfflineSync();