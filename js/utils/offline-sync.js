// js/utils/offline-sync.js - Complete with proper Firebase imports
import { db, rtdb } from '../config/firebase-config.js';

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
        try {
            const cache = this.getCache();
            cache[key] = {
                data: data,
                timestamp: Date.now(),
                synced: false
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cache));
            console.log(`Data cached for key: ${key}`);
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }

    getCachedData(key) {
        const cache = this.getCache();
        if (cache[key] && this.isCacheValid(cache[key].timestamp)) {
            return cache[key].data;
        }
        return null;
    }

    getCache() {
        try {
            const cache = localStorage.getItem(this.cacheKey);
            return cache ? JSON.parse(cache) : {};
        } catch (error) {
            console.error('Error reading cache:', error);
            return {};
        }
    }

    isCacheValid(timestamp) {
        // Cache valid for 24 hours
        return (Date.now() - timestamp) < 24 * 60 * 60 * 1000;
    }

    async syncData() {
        const cache = this.getCache();
        const unsyncedItems = Object.keys(cache).filter(key => !cache[key].synced);
        
        if (unsyncedItems.length === 0) {
            console.log('No unsynced data found');
            return;
        }
        
        this.showToast(`Syncing ${unsyncedItems.length} items...`, 'info');
        
        for (const key of unsyncedItems) {
            try {
                await this.syncToFirebase(key, cache[key].data);
                cache[key].synced = true;
                console.log(`Synced ${key} successfully`);
            } catch (error) {
                console.error(`Failed to sync ${key}:`, error);
            }
        }
        
        localStorage.setItem(this.cacheKey, JSON.stringify(cache));
        
        const failedItems = unsyncedItems.filter(key => !cache[key].synced);
        if (failedItems.length === 0) {
            this.showToast('All offline data synced successfully!', 'success');
        } else {
            this.showToast(`Synced ${unsyncedItems.length - failedItems.length} of ${unsyncedItems.length} items`, 'warning');
        }
        
        // Dispatch sync complete event
        window.dispatchEvent(new CustomEvent('syncCompleted', { 
            detail: { synced: unsyncedItems.length - failedItems.length, total: unsyncedItems.length }
        }));
    }

    async syncToFirebase(key, data) {
        // Make sure we have valid data
        if (!data) {
            console.warn(`No data to sync for key: ${key}`);
            return;
        }
        
        switch(key) {
            case 'devices':
                if (!db) {
                    throw new Error('Firestore db not available');
                }
                const devicesRef = db.collection('devices');
                for (const device of data) {
                    try {
                        if (device.id && device.id !== 'undefined') {
                            // Update existing device
                            await devicesRef.doc(device.id).set(device, { merge: true });
                        } else {
                            // Create new device
                            const newDevice = { ...device };
                            delete newDevice.id;
                            await devicesRef.add(newDevice);
                        }
                    } catch (error) {
                        console.error(`Error syncing device ${device.name}:`, error);
                    }
                }
                break;
                
            case 'networkMetrics':
                if (!rtdb) {
                    throw new Error('Realtime Database not available');
                }
                const metricsRef = rtdb.ref('metrics');
                // Store only the latest 100 metrics to avoid bloating
                const latestMetrics = Array.isArray(data) ? data.slice(-100) : data;
                await metricsRef.set(latestMetrics);
                break;
                
            case 'securityEvents':
                if (!db) {
                    throw new Error('Firestore db not available');
                }
                const eventsRef = db.collection('securityEvents');
                for (const event of data) {
                    try {
                        await eventsRef.add(event);
                    } catch (error) {
                        console.error('Error syncing security event:', error);
                    }
                }
                break;
                
            default:
                console.log('Unknown sync key:', key);
        }
    }

    async saveDeviceOffline(device) {
        try {
            let devices = this.getCachedData('devices') || [];
            // Check if device already exists
            const existingIndex = devices.findIndex(d => d.id === device.id);
            if (existingIndex >= 0) {
                devices[existingIndex] = { ...device, _synced: false };
            } else {
                devices.push({ ...device, _synced: false });
            }
            await this.cacheData('devices', devices);
            console.log('Device saved offline:', device.name);
        } catch (error) {
            console.error('Error saving device offline:', error);
        }
    }

    async saveMetricsOffline(metrics) {
        try {
            let cachedMetrics = this.getCachedData('networkMetrics') || [];
            cachedMetrics.push({
                ...metrics,
                timestamp: Date.now()
            });
            // Keep only last 500 metrics
            if (cachedMetrics.length > 500) {
                cachedMetrics = cachedMetrics.slice(-500);
            }
            await this.cacheData('networkMetrics', cachedMetrics);
        } catch (error) {
            console.error('Error saving metrics offline:', error);
        }
    }

    async saveSecurityEventOffline(event) {
        try {
            let events = this.getCachedData('securityEvents') || [];
            events.push({
                ...event,
                _synced: false,
                timestamp: Date.now()
            });
            // Keep only last 100 events
            if (events.length > 100) {
                events = events.slice(-100);
            }
            await this.cacheData('securityEvents', events);
        } catch (error) {
            console.error('Error saving security event offline:', error);
        }
    }

    showOfflineMode() {
        this.showToast('You are offline. Using cached data.', 'warning');
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.classList.add('offline');
            connectionStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
            connectionStatus.style.color = 'var(--danger-color)';
        }
        
        // Dispatch offline event
        window.dispatchEvent(new CustomEvent('appOffline'));
    }

    showToast(message, type) {
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
        if (closeBtn) {
            closeBtn.onclick = () => toast.remove();
        }
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    async clearCache() {
        try {
            localStorage.removeItem(this.cacheKey);
            console.log('Cache cleared');
            this.showToast('Cache cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    getCacheStats() {
        const cache = this.getCache();
        const stats = {};
        for (const key in cache) {
            if (cache[key].data) {
                stats[key] = {
                    size: Array.isArray(cache[key].data) ? cache[key].data.length : 1,
                    timestamp: new Date(cache[key].timestamp).toLocaleString(),
                    synced: cache[key].synced
                };
            }
        }
        return stats;
    }
}

export const offlineSync = new OfflineSync();