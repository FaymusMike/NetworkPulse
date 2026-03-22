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

// Disable persistence to avoid conflicts (temporary fix)
// Enable offline persistence with error handling
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence disabled');
        } else if (err.code === 'unimplemented') {
            console.warn('Browser doesn\'t support persistence');
        }
    });

// Initialize Realtime Database with default data if empty (with error handling)
const initializeDatabase = async () => {
    try {
        const networkStatusRef = rtdb.ref('networkStatus');
        const status = await networkStatusRef.get();
        if (!status.exists()) {
            await networkStatusRef.set({
                healthScore: 98,
                healthStatus: 'Excellent',
                lastUpdated: Date.now()
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
                packetLoss: []
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