// Firebase Configuration
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

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence');
        }
    });

// Initialize Realtime Database with default data if empty
const initializeDatabase = async () => {
    const networkStatusRef = rtdb.ref('networkStatus');
    const status = await networkStatusRef.get();
    if (!status.exists()) {
        networkStatusRef.set({
            healthScore: 98,
            healthStatus: 'Excellent',
            lastUpdated: Date.now()
        });
    }
    
    const metricsRef = rtdb.ref('metrics');
    const metrics = await metricsRef.get();
    if (!metrics.exists()) {
        metricsRef.set({
            bandwidth: [],
            latency: [],
            packetLoss: []
        });
    }
};

initializeDatabase();