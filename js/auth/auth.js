// js/auth/auth.js - Critical fixes
import { auth, db, initDefaultData } from '../config/firebase-config.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userRole = 'viewer';
        this.setupAuthListener();
    }

    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadOrCreateUserProfile(user);
                this.onAuthSuccess();
            } else {
                this.onAuthFailure();
            }
        });
    }

    async loadOrCreateUserProfile(user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                this.userRole = userDoc.data().role || 'viewer';
            } else {
                // Create new user profile
                const role = 'viewer'; // Default role for new users
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    role: role,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.userRole = role;
                
                // Initialize default data for new user
                await initDefaultData(user.uid);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.userRole = 'viewer';
        }
    }

    async loginWithEmail(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            this.showToast('Login successful!', 'success');
            return result;
        } catch (error) {
            this.showToast(this.getErrorMessage(error.code), 'error');
            throw error;
        }
    }

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            this.showToast('Google login successful!', 'success');
            return result;
        } catch (error) {
            this.showToast(this.getErrorMessage(error.code), 'error');
            throw error;
        }
    }

    async signupWithEmail(name, email, password, role) {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName: name });
            
            await db.collection('users').doc(result.user.uid).set({
                name: name,
                email: email,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Initialize default data
            await initDefaultData(result.user.uid);
            
            this.showToast('Account created successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast(this.getSignupErrorMessage(error.code), 'error');
            throw error;
        }
    }

    getErrorMessage(code) {
        const errors = {
            'auth/wrong-password': 'Invalid email or password',
            'auth/user-not-found': 'No account found with this email',
            'auth/email-already-in-use': 'Email already registered. Please login.',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password must be at least 6 characters',
            'auth/network-request-failed': 'Network error. Check your connection.'
        };
        return errors[code] || 'Authentication failed. Please try again.';
    }

    getSignupErrorMessage(code) {
        const errors = {
            'auth/email-already-in-use': 'Email already registered. Please login instead.',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password must be at least 6 characters',
            'auth/network-request-failed': 'Network error. Please check your connection.'
        };
        return errors[code] || 'Signup failed. Please try again.';
    }

    async logout() {
        try {
            await auth.signOut();
            this.showToast('Logged out successfully', 'success');
        } catch (error) {
            this.showToast('Error logging out', 'error');
        }
    }

    onAuthSuccess() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        
        if (authContainer) authContainer.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        
        // Update user info in sidebar
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        
        if (userNameEl) {
            userNameEl.textContent = this.currentUser?.displayName || this.currentUser?.email?.split('@')[0] || 'User';
        }
        if (userRoleEl) {
            userRoleEl.textContent = this.userRole?.toUpperCase() || 'VIEWER';
        }
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('userLoggedIn', { 
            detail: { user: this.currentUser, role: this.userRole } 
        }));
        
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }

    onAuthFailure() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (authContainer) authContainer.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    hasPermission(requiredRole) {
        const roleHierarchy = { 'admin': 3, 'network-engineer': 2, 'viewer': 1 };
        return roleHierarchy[this.userRole] >= roleHierarchy[requiredRole];
    }
}

export const authManager = new AuthManager();