// js/utils/offline-sync.js - Complete fixed version
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
        return (Date.now() - timestamp) < 24 * 60 * 60 * 1000;
    }

    async syncData() {
        // Only sync if online
        if (!navigator.onLine) {
            console.log('Offline, skipping sync');
            return;
        }
        
        const cache = this.getCache();
        const unsyncedItems = Object.keys(cache).filter(key => !cache[key].synced);
        
        if (unsyncedItems.length === 0) {
            return;
        }
        
        console.log(`Syncing ${unsyncedItems.length} items...`);
        
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
    }

    async syncToFirebase(key, data) {
        if (!data) return;
        
        // Check if Firebase is initialized
        if (!db && key !== 'networkMetrics') {
            console.warn('Firestore not available for sync');
            return;
        }
        
        switch(key) {
            case 'devices':
                if (db) {
                    const devicesRef = db.collection('devices');
                    for (const device of data) {
                        try {
                            if (device.id && device.id !== 'undefined') {
                                await devicesRef.doc(device.id).set(device, { merge: true });
                            } else if (device.name) {
                                const newDevice = { ...device };
                                delete newDevice.id;
                                await devicesRef.add(newDevice);
                            }
                        } catch (error) {
                            console.error(`Error syncing device:`, error);
                        }
                    }
                }
                break;
                
            case 'networkMetrics':
                if (rtdb) {
                    const metricsRef = rtdb.ref('metrics');
                    const latestMetrics = Array.isArray(data) ? data.slice(-100) : data;
                    await metricsRef.set(latestMetrics);
                }
                break;
                
            case 'securityEvents':
                if (db) {
                    const eventsRef = db.collection('securityEvents');
                    for (const event of data) {
                        try {
                            await eventsRef.add(event);
                        } catch (error) {
                            console.error('Error syncing security event:', error);
                        }
                    }
                }
                break;
        }
    }

    async saveDeviceOffline(device) {
        try {
            let devices = this.getCachedData('devices') || [];
            const existingIndex = devices.findIndex(d => d.id === device.id);
            if (existingIndex >= 0) {
                devices[existingIndex] = { ...device, _synced: false };
            } else {
                devices.push({ ...device, _synced: false });
            }
            await this.cacheData('devices', devices);
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
            if (cachedMetrics.length > 500) {
                cachedMetrics = cachedMetrics.slice(-500);
            }
            await this.cacheData('networkMetrics', cachedMetrics);
        } catch (error) {
            console.error('Error saving metrics offline:', error);
        }
    }

    showOfflineMode() {
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.classList.add('offline');
            connectionStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
        }
    }
}

export const offlineSync = new OfflineSync();