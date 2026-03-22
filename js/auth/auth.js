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
        }
    }

    async loginWithEmail(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            this.showToast('Login successful!', 'success');
            return result;
        } catch (error) {
            this.showToast(error.message, 'error');
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
            this.showToast(error.message, 'error');
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
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.showToast('Account created successfully!', 'success');
            return result;
        } catch (error) {
            this.showToast(error.message, 'error');
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

    onAuthSuccess() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('loading-overlay').style.display = 'none';
        
        // Update UI with user info
        document.getElementById('user-name').textContent = 
            this.currentUser.displayName || this.currentUser.email.split('@')[0];
        document.getElementById('user-role').textContent = this.userRole.toUpperCase();
        
        // Dispatch user logged in event
        window.dispatchEvent(new CustomEvent('userLoggedIn', { 
            detail: { user: this.currentUser, role: this.userRole } 
        }));
    }

    onAuthFailure() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
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
        const roleHierarchy = {
            'admin': 3,
            'network-engineer': 2,
            'viewer': 1
        };
        
        return roleHierarchy[this.userRole] >= roleHierarchy[requiredRole];
    }
}

export const authManager = new AuthManager();