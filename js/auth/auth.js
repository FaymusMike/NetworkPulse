// js/auth/auth.js
import { auth, db } from '../config/firebase-config.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.setupAuthListener();
    }

    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserRole(user.uid);
                this.onAuthSuccess();
            } else {
                this.onAuthFailure();
            }
        });
    }

    async loadUserRole(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                this.userRole = userDoc.data().role;
            } else {
                // Create user profile if doesn't exist
                await db.collection('users').doc(uid).set({
                    email: this.currentUser.email,
                    name: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                    role: 'viewer',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.userRole = 'viewer';
            }
        } catch (error) {
            console.error('Error loading user role:', error);
            // Set default role if can't load
            this.userRole = 'viewer';
        }
    }

    async loginWithEmail(email, password) {
        try {
            // Clear any existing auth state
            await this.clearAuthState();
            
            const result = await auth.signInWithEmailAndPassword(email, password);
            this.showToast('Login successful! Welcome back.', 'success');
            return result;
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(this.getErrorMessage(error.code), 'error');
            throw error;
        }
    }

    async loginWithGoogle() {
        try {
            // Clear any existing auth state
            await this.clearAuthState();
            
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            const result = await auth.signInWithPopup(provider);
            this.showToast('Google login successful! Welcome!', 'success');
            return result;
        } catch (error) {
            console.error('Google login error:', error);
            this.showToast(this.getErrorMessage(error.code), 'error');
            throw error;
        }
    }

    async signupWithEmail(name, email, password, role) {
        try {
            // Clear any existing auth state first
            await this.clearAuthState();
            
            // Check if user already exists before attempting signup
            try {
                const signInMethods = await auth.fetchSignInMethodsForEmail(email);
                if (signInMethods && signInMethods.length > 0) {
                    this.showToast('An account already exists with this email. Please login instead.', 'warning');
                    return null;
                }
            } catch (error) {
                console.log('Error checking existing user:', error);
                // Continue with signup - let Firebase handle it
            }
            
            const result = await auth.createUserWithEmailAndPassword(email, password);
            
            if (result.user) {
                await result.user.updateProfile({ displayName: name });
                
                // Create user document in Firestore
                await db.collection('users').doc(result.user.uid).set({
                    name: name,
                    email: email,
                    role: role,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            this.showToast('Account created successfully! Welcome to NetworkPulse!', 'success');
            return result;
        } catch (error) {
            console.error('Signup error:', error);
            
            // Handle specific Firebase errors
            if (error.code === 'auth/email-already-in-use') {
                this.showToast('This email is already registered. Please login instead.', 'warning');
            } else if (error.code === 'auth/network-request-failed') {
                this.showToast('Network error. Please check your internet connection.', 'error');
            } else {
                this.showToast(this.getSignupErrorMessage(error.code), 'error');
            }
            throw error;
        }
    }

    async clearAuthState() {
        try {
            // Sign out any existing user
            if (auth.currentUser) {
                await auth.signOut();
            }
            // Small delay to ensure state is cleared
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('Error clearing auth state:', error);
        }
    }

    getErrorMessage(code) {
        const errors = {
            'auth/wrong-password': 'Invalid email or password. Please try again.',
            'auth/user-not-found': 'No account found with this email. Please sign up first.',
            'auth/email-already-in-use': 'This email is already registered. Please login instead.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
            'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
            'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups for this site.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/operation-not-allowed': 'Email/Password sign-in is not enabled. Please contact support.'
        };
        return errors[code] || `Authentication failed: ${code}`;
    }

    getSignupErrorMessage(code) {
        const errors = {
            'auth/email-already-in-use': 'This email is already registered. Please login instead.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/network-request-failed': 'Network error. Please check your internet connection.',
            'auth/operation-not-allowed': 'Email/Password sign-up is not enabled. Please contact support.'
        };
        return errors[code] || `Signup failed: ${code}`;
    }

    async logout() {
        try {
            await auth.signOut();
            this.showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error logging out. Please try again.', 'error');
        }
    }

    onAuthSuccess() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (authContainer) authContainer.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        
        // Update UI with user info
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        
        if (userNameEl) {
            userNameEl.textContent = this.currentUser.displayName || this.currentUser.email.split('@')[0];
        }
        if (userRoleEl) {
            userRoleEl.textContent = this.userRole ? this.userRole.toUpperCase() : 'VIEWER';
            userRoleEl.className = `user-role-badge role-${this.userRole || 'viewer'}`;
        }
        
        // Dispatch user logged in event
        window.dispatchEvent(new CustomEvent('userLoggedIn', { 
            detail: { user: this.currentUser, role: this.userRole || 'viewer' } 
        }));
    }

    onAuthFailure() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (authContainer) authContainer.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        
        // Clear any stale user data
        localStorage.removeItem('networkPlatformCache');
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    hasPermission(requiredRole) {
        const roleHierarchy = {
            'admin': 3,
            'network-engineer': 2,
            'viewer': 1
        };
        
        const userRoleLevel = roleHierarchy[this.userRole] || 1;
        const requiredLevel = roleHierarchy[requiredRole] || 1;
        
        return userRoleLevel >= requiredLevel;
    }
}

export const authManager = new AuthManager();