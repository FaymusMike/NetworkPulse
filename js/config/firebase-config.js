// js/config/firebase-config.js - COMPLETE FIXED VERSION
const firebaseConfig = {
    apiKey: "AIzaSyAjJQlSLLDxvNIB7E9hiTHgGCRMPFAym14",
    authDomain: "firstbank-biometrics.firebaseapp.com",
    databaseURL: "https://firstbank-biometrics-default-rtdb.firebaseio.com",
    projectId: "firstbank-biometrics",
    storageBucket: "firstbank-biometrics.firebasestorage.app",
    messagingSenderId: "744204659741",
    appId: "1:744204659741:web:1a0c1e8ebc7f17f18e2af4"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Export Firebase services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const rtdb = firebase.database();

// Enable persistence with error handling
try {
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            console.log('Persistence not available:', err.message);
        });
} catch (error) {
    console.log('Persistence setup skipped');
}

// Initialize default data
export const initDefaultData = async () => {
    try {
        if (!db) return;
        
        const devicesSnapshot = await db.collection('devices').limit(1).get();
        
        if (devicesSnapshot.empty) {
            console.log('Creating sample devices...');
            
            const sampleDevices = [
                { name: 'Core Router', type: 'router', ip: '192.168.1.1', subnet: '255.255.255.0', vlan: 1, status: 'active', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Main Switch', type: 'switch', ip: '192.168.1.2', subnet: '255.255.255.0', vlan: 1, status: 'active', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Firewall', type: 'firewall', ip: '192.168.1.254', subnet: '255.255.255.0', vlan: 1, status: 'active', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Web Server', type: 'server', ip: '192.168.1.10', subnet: '255.255.255.0', vlan: 10, status: 'active', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Database Server', type: 'server', ip: '192.168.1.11', subnet: '255.255.255.0', vlan: 10, status: 'active', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Admin PC', type: 'client', ip: '192.168.1.100', subnet: '255.255.255.0', vlan: 1, status: 'active', createdAt: new Date(), lastSeen: new Date() }
            ];
            
            for (const device of sampleDevices) {
                await db.collection('devices').add(device);
            }
            console.log('Sample devices created');
        }
        
        if (rtdb) {
            const statusRef = rtdb.ref('networkStatus');
            const status = await statusRef.get();
            if (!status.exists()) {
                await statusRef.set({
                    healthScore: 98,
                    healthStatus: 'Excellent',
                    lastUpdated: Date.now()
                });
            }
        }
        
    } catch (error) {
        console.error('Error initializing data:', error);
    }
};

// Monitor connection
if (rtdb) {
    rtdb.ref('.info/connected').on('value', (snap) => {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            if (snap.val()) {
                statusEl.innerHTML = '<i class="fas fa-wifi"></i> Online';
                statusEl.classList.remove('offline');
            } else {
                statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
                statusEl.classList.add('offline');
            }
        }
    });
}

// Initialize data on login
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User authenticated:', user.email);
        await initDefaultData();
    }
});