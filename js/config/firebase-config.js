// js/config/firebase-config.js - COMPLETE with all features + fixes
const firebaseConfig = {
    apiKey: "AIzaSyAjJQlSLLDxvNIB7E9hiTHgGCRMPFAym14",
    authDomain: "firstbank-biometrics.firebaseapp.com",
    databaseURL: "https://firstbank-biometrics-default-rtdb.firebaseio.com",
    projectId: "firstbank-biometrics",
    storageBucket: "firstbank-biometrics.firebasestorage.app",
    messagingSenderId: "744204659741",
    appId: "1:744204659741:web:1a0c1e8ebc7f17f18e2af4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();
export const rtdb = firebase.database();

// Fix: Use modern persistence method without deprecated API
try {
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
    
    // Modern persistence approach - handle gracefully
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.log('Multiple tabs open, persistence disabled');
            } else if (err.code === 'unimplemented') {
                console.log('Browser doesn\'t support persistence');
            } else {
                console.log('Persistence error:', err.message);
            }
        });
} catch (error) {
    console.log('Persistence setup skipped:', error.message);
}

// Create default data on first login - Enhanced version
export const initDefaultData = async (userId) => {
    try {
        // Check if devices collection exists
        const devicesSnapshot = await db.collection('devices').limit(1).get();
        
        if (devicesSnapshot.empty) {
            console.log('Creating sample devices...');
            
            // Enhanced sample devices with full configuration
            const sampleDevices = [
                { 
                    name: 'Core Router', 
                    type: 'router', 
                    ip: '192.168.1.1', 
                    subnet: '255.255.255.0', 
                    vlan: 1, 
                    status: 'active', 
                    config: 'hostname Core-Router\nenable secret cisco\ninterface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0\n no shutdown',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp() 
                },
                { 
                    name: 'Main Switch', 
                    type: 'switch', 
                    ip: '192.168.1.2', 
                    subnet: '255.255.255.0', 
                    vlan: 1, 
                    status: 'active',
                    config: 'hostname Main-Switch\nvlan 1\n name Default\nvlan 10\n name Servers\ninterface vlan 1\n ip address 192.168.1.2 255.255.255.0',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp() 
                },
                { 
                    name: 'Firewall', 
                    type: 'firewall', 
                    ip: '192.168.1.254', 
                    subnet: '255.255.255.0', 
                    vlan: 1, 
                    status: 'active',
                    config: 'access-list 100 permit ip any any\ninterface outside\n ip address 203.0.113.1 255.255.255.248\ninterface inside\n ip address 192.168.1.254 255.255.255.0',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp() 
                },
                { 
                    name: 'Web Server', 
                    type: 'server', 
                    ip: '192.168.1.10', 
                    subnet: '255.255.255.0', 
                    vlan: 10, 
                    status: 'active',
                    config: 'Server Role: Web Server\nOS: Ubuntu 22.04\nServices: Nginx, PHP-FPM\nPorts: 80, 443',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp() 
                },
                { 
                    name: 'Database Server', 
                    type: 'server', 
                    ip: '192.168.1.11', 
                    subnet: '255.255.255.0', 
                    vlan: 10, 
                    status: 'active',
                    config: 'Server Role: Database Server\nOS: Ubuntu 22.04\nDatabase: MySQL 8.0\nPort: 3306',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp() 
                },
                { 
                    name: 'Admin Workstation', 
                    type: 'client', 
                    ip: '192.168.1.100', 
                    subnet: '255.255.255.0', 
                    vlan: 1, 
                    status: 'active',
                    config: 'Device: Dell OptiPlex\nOS: Windows 11 Pro\nUser: Administrator\nDepartment: IT',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp() 
                }
            ];
            
            for (const device of sampleDevices) {
                await db.collection('devices').add(device);
            }
            console.log('Sample devices created successfully');
        }
        
        // Check if alerts collection exists and add welcome alert
        const alertsSnapshot = await db.collection('alerts').limit(1).get();
        if (alertsSnapshot.empty) {
            await db.collection('alerts').add({
                title: 'Welcome to NetworkPulse!',
                message: 'Your network monitoring platform is ready. Start by exploring the topology view or adding devices.',
                severity: 'info',
                resolved: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Welcome alert created');
        }
        
        // Initialize network status in Realtime Database if empty
        const statusRef = rtdb.ref('networkStatus');
        const status = await statusRef.get();
        if (!status.exists()) {
            await statusRef.set({
                healthScore: 98,
                healthStatus: 'Excellent',
                lastUpdated: firebase.database.ServerValue.TIMESTAMP,
                metrics: {
                    bandwidth: 0,
                    latency: 0,
                    packetLoss: 0
                }
            });
            console.log('Network status initialized');
        }
        
    } catch (error) {
        console.error('Error initializing default data:', error);
    }
};

// Monitor connection with enhanced status updates
rtdb.ref('.info/connected').on('value', (snap) => {
    const isConnected = snap.val();
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        if (isConnected) {
            statusEl.innerHTML = '<i class="fas fa-wifi"></i> Online';
            statusEl.classList.remove('offline');
            statusEl.style.color = 'var(--success-color)';
            
            // Dispatch custom event for connection restored
            window.dispatchEvent(new CustomEvent('firebaseConnected'));
        } else {
            statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
            statusEl.classList.add('offline');
            statusEl.style.color = 'var(--danger-color)';
            
            // Dispatch custom event for connection lost
            window.dispatchEvent(new CustomEvent('firebaseDisconnected'));
        }
    }
});

// Listen for auth state changes and initialize data
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User authenticated:', user.email);
        await initDefaultData(user.uid);
        
        // Update user last login
        try {
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.log('User document not yet created');
        }
    }
});

// Export connection status helper
export const connectionMonitor = {
    isConnected: () => {
        return new Promise((resolve) => {
            rtdb.ref('.info/connected').once('value', (snap) => {
                resolve(snap.val() === true);
            });
        });
    },
    
    onConnect: (callback) => {
        rtdb.ref('.info/connected').on('value', (snap) => {
            if (snap.val() === true) {
                callback();
            }
        });
    },
    
    onDisconnect: (callback) => {
        rtdb.ref('.info/connected').on('value', (snap) => {
            if (snap.val() === false) {
                callback();
            }
        });
    }
};

// Export helper for real-time sync status
export const syncStatus = {
    isSyncing: false,
    lastSync: null,
    
    startSync: () => {
        syncStatus.isSyncing = true;
        window.dispatchEvent(new CustomEvent('syncStarted'));
    },
    
    endSync: () => {
        syncStatus.isSyncing = false;
        syncStatus.lastSync = Date.now();
        window.dispatchEvent(new CustomEvent('syncCompleted'));
    }
};