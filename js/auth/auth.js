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
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.userRole = 'viewer';
            }
        } catch (error) {
            console.error('Error loading user role:', error);
            this.userRole = 'viewer';
        }
    }

    async loginWithEmail(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            this.showToast('Login successful! Welcome back.', 'success');
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
            this.showToast('Google login successful! Welcome!', 'success');
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
            
            this.showToast('Account created successfully! Welcome to NetworkPulse!', 'success');
            return result;
        } catch (error) {
            this.showToast(this.getErrorMessage(error.code), 'error');
            throw error;
        }
    }

    async logout() {
        try {
            await auth.signOut();
            this.showToast('Logged out successfully', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    getErrorMessage(code) {
        const errors = {
            'auth/wrong-password': 'Invalid email or password',
            'auth/user-not-found': 'No account found with this email',
            'auth/email-already-in-use': 'Email already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password should be at least 6 characters'
        };
        return errors[code] || 'Authentication failed. Please try again.';
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
            userRoleEl.textContent = this.userRole.toUpperCase();
            userRoleEl.className = `user-role-badge role-${this.userRole}`;
        }
        
        // Dispatch user logged in event
        window.dispatchEvent(new CustomEvent('userLoggedIn', { 
            detail: { user: this.currentUser, role: this.userRole } 
        }));
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
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    hasPermission(requiredRole) {
        const roleHierarchy = {
            'admin': 3,
            'network-engineer': 2,
            'viewer': 1
        };
        
        return roleHierarchy[this.userRole] >= roleHierarchy[requiredRole];
    }
}

export const authManager = new AuthManager();