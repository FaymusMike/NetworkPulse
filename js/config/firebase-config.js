// js/config/firebase-config.js - Ensure proper exports
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const rtdb = firebase.database();

// Export a check to ensure Firebase is ready
export const isFirebaseReady = () => {
    return firebase.apps.length > 0;
};

// Simple persistence setup
try {
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            console.log('Persistence not available:', err.message);
        });
} catch (error) {
    console.log('Persistence setup skipped');
}

// Initialize default data
export const initDefaultData = async (userId) => {
    try {
        // Check if devices exist
        const devicesSnapshot = await db.collection('devices').limit(1).get();
        
        if (devicesSnapshot.empty) {
            console.log('Creating sample devices...');
            
            const sampleDevices = [
                { name: 'Core Router', type: 'router', ip: '192.168.1.1', subnet: '255.255.255.0', vlan: 1, status: 'active', config: 'hostname Core-Router\ninterface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0\n no shutdown', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Main Switch', type: 'switch', ip: '192.168.1.2', subnet: '255.255.255.0', vlan: 1, status: 'active', config: 'hostname Main-Switch\nvlan 1\n name Default', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Firewall', type: 'firewall', ip: '192.168.1.254', subnet: '255.255.255.0', vlan: 1, status: 'active', config: 'access-list 100 permit ip any any', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Web Server', type: 'server', ip: '192.168.1.10', subnet: '255.255.255.0', vlan: 10, status: 'active', config: 'Server: Nginx, PHP-FPM', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Database Server', type: 'server', ip: '192.168.1.11', subnet: '255.255.255.0', vlan: 10, status: 'active', config: 'Database: MySQL 8.0', createdAt: new Date(), lastSeen: new Date() },
                { name: 'Admin PC', type: 'client', ip: '192.168.1.100', subnet: '255.255.255.0', vlan: 1, status: 'active', config: 'Windows 11 Pro', createdAt: new Date(), lastSeen: new Date() }
            ];
            
            for (const device of sampleDevices) {
                await db.collection('devices').add(device);
            }
            console.log('Sample devices created');
        }
        
        // Initialize network status
        const statusRef = rtdb.ref('networkStatus');
        const status = await statusRef.get();
        if (!status.exists()) {
            await statusRef.set({
                healthScore: 98,
                healthStatus: 'Excellent',
                lastUpdated: Date.now()
            });
        }
        
    } catch (error) {
        console.error('Error initializing data:', error);
    }
};

// Monitor connection
rtdb.ref('.info/connected').on('value', (snap) => {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        if (snap.val()) {
            statusEl.innerHTML = '<i class="fas fa-wifi"></i> Online';
            statusEl.classList.remove('offline');
            statusEl.style.color = 'var(--success-color)';
        } else {
            statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
            statusEl.classList.add('offline');
            statusEl.style.color = 'var(--danger-color)';
        }
    }
});

// Initialize data on login
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await initDefaultData(user.uid);
    }
});