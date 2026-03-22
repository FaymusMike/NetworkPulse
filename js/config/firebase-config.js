// js/config/firebase-config.js
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

// Fix: Use modern persistence method
try {
    // Enable offline persistence with modern approach
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
    
    // Enable persistence with better error handling
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code === 'unimplemented') {
                console.warn('The current browser does not support persistence');
            } else {
                console.warn('Persistence error:', err);
            }
        });
} catch (error) {
    console.warn('Persistence setup failed:', error);
}

// Initialize Realtime Database with default data
const initializeDatabase = async () => {
    try {
        // Check if user is authenticated before trying to write
        const user = auth.currentUser;
        if (!user) return;
        
        const networkStatusRef = rtdb.ref('networkStatus');
        const status = await networkStatusRef.get();
        if (!status.exists()) {
            await networkStatusRef.set({
                healthScore: 98,
                healthStatus: 'Excellent',
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            });
        }
    } catch (error) {
        console.error('Error initializing network status:', error);
    }
    
    try {
        const metricsRef = rtdb.ref('metrics');
        const metrics = await metricsRef.get();
        if (!metrics.exists()) {
            await metricsRef.set({
                bandwidth: [],
                latency: [],
                packetLoss: [],
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            });
        }
    } catch (error) {
        console.error('Error initializing metrics:', error);
    }
};

// Wait for auth before initializing
auth.onAuthStateChanged((user) => {
    if (user) {
        initializeDatabase();
    }
});

// Add connection monitoring
rtdb.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        console.log('Connected to Firebase Realtime Database');
    } else {
        console.log('Disconnected from Firebase Realtime Database');
    }
});