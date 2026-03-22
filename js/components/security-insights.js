import { apiClients } from '../utils/api-clients.js';
import { db } from '../config/firebase-config.js';

class SecurityInsights {
    constructor() {
        this.setupEventListeners();
    }

    initialize() {
        this.loadSecurityDashboard();
    }

    setupEventListeners() {
        // Password Check
        document.getElementById('check-password')?.addEventListener('click', () => this.checkPassword());
        document.getElementById('password-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkPassword();
        });
        
        // IP Threat Check
        document.getElementById('check-ip-threat')?.addEventListener('click', () => this.checkIPThreat());
        document.getElementById('threat-ip-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkIPThreat();
        });
        
        // DNS Resolution Check
        document.getElementById('check-dns')?.addEventListener('click', () => this.checkDNSResolution());
        document.getElementById('dns-check-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkDNSResolution();
        });
        
        // Geo-IP Tracker
        document.getElementById('track-geo-ip')?.addEventListener('click', () => this.trackGeoIP());
        document.getElementById('geo-ip-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.trackGeoIP();
        });
    }

    async loadSecurityDashboard() {
        // Load recent security events
        const eventsSnapshot = await db.collection('securityEvents')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const eventsList = document.getElementById('security-events-list');
        if (eventsList && !eventsSnapshot.empty) {
            eventsList.innerHTML = '';
            eventsSnapshot.forEach(doc => {
                const event = doc.data();
                const eventDiv = document.createElement('div');
                eventDiv.className = `security-event severity-${event.severity}`;
                eventDiv.innerHTML = `
                    <div class="event-icon">
                        <i class="fas ${this.getEventIcon(event.type)}"></i>
                    </div>
                    <div class="event-details">
                        <strong>${event.title}</strong>
                        <p>${event.description}</p>
                        <small>${new Date(event.timestamp).toLocaleString()}</small>
                    </div>
                `;
                eventsList.appendChild(eventDiv);
            });
        }
    }

    async checkPassword() {
        const password = document.getElementById('password-input').value;
        if (!password) {
            this.showToast('Please enter a password to check', 'warning');
            return;
        }
        
        const resultDiv = document.getElementById('password-result');
        resultDiv.innerHTML = '<div class="loading-spinner">Checking password security...</div>';
        
        try {
            // Check password strength
            const strength = this.checkPasswordStrength(password);
            
            // Check if password has been pwned
            const hash = await this.hashPassword(password);
            const pwnedCount = await apiClients.checkPwnedPassword(hash);
            
            let securityScore = strength.score;
            let recommendations = [];
            
            if (pwnedCount > 0) {
                securityScore = 0;
                recommendations.push('⚠️ This password has been found in data breaches! Do NOT use it.');
                recommendations.push(`Found in ${pwnedCount} breaches`);
            }
            
            if (strength.issues.length > 0) {
                recommendations.push(...strength.issues);
            }
            
            resultDiv.innerHTML = `
                <div class="result-card ${securityScore >= 3 ? 'success' : securityScore > 0 ? 'warning' : 'danger'}">
                    <h4>Password Security Analysis</h4>
                    <div class="security-score">
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${(securityScore / 4) * 100}%"></div>
                        </div>
                        <span class="score-value">Strength: ${strength.label}</span>
                    </div>
                    ${pwnedCount > 0 ? `
                        <div class="alert-critical">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>BREACH ALERT:</strong> This password has been exposed in ${pwnedCount} data breaches!
                        </div>
                    ` : ''}
                    <div class="recommendations">
                        <strong>Recommendations:</strong>
                        <ul>
                            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
            
            // Log security check
            await this.logSecurityEvent('password_check', {
                strength: strength.label,
                pwned: pwnedCount > 0,
                timestamp: Date.now()
            });
            
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error checking password: ${error.message}</div>`;
        }
    }

    checkPasswordStrength(password) {
        let score = 0;
        let issues = [];
        
        // Length check
        if (password.length >= 12) {
            score += 2;
        } else if (password.length >= 8) {
            score += 1;
            issues.push('Use at least 12 characters for better security');
        } else {
            issues.push('Password is too short (minimum 8 characters)');
        }
        
        // Complexity checks
        if (/[A-Z]/.test(password)) score += 1;
        else issues.push('Add uppercase letters');
        
        if (/[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        else issues.push('Add numbers');
        
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        else issues.push('Add special characters (!@#$% etc.)');
        
        // Common patterns check
        const commonPatterns = ['123456', 'password', 'qwerty', 'admin', 'letmein'];
        if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
            score = Math.max(0, score - 2);
            issues.push('Contains common password patterns');
        }
        
        let label = 'Weak';
        if (score >= 6) label = 'Very Strong';
        else if (score >= 4) label = 'Strong';
        else if (score >= 2) label = 'Moderate';
        
        return { score: Math.min(score, 4), label, issues };
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    async checkIPThreat() {
        const ip = document.getElementById('threat-ip-input').value.trim();
        if (!ip) {
            this.showToast('Please enter an IP address', 'warning');
            return;
        }
        
        const resultDiv = document.getElementById('ip-threat-result');
        resultDiv.innerHTML = '<div class="loading-spinner">Checking IP reputation...</div>';
        
        try {
            const threatData = await apiClients.checkIPThreat(ip);
            
            resultDiv.innerHTML = `
                <div class="result-card ${threatData.abuseConfidenceScore > 50 ? 'danger' : 'success'}">
                    <h4>IP Threat Intelligence Report</h4>
                    <div class="threat-score">
                        <strong>Abuse Confidence Score:</strong>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${threatData.abuseConfidenceScore}%; background: ${threatData.abuseConfidenceScore > 50 ? '#ff4757' : '#00ff9d'}"></div>
                        </div>
                        <span>${threatData.abuseConfidenceScore}%</span>
                    </div>
                    <div class="threat-details">
                        <div class="detail-row">
                            <strong>Total Reports:</strong>
                            <span>${threatData.totalReports || 0}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Last Reported:</strong>
                            <span>${threatData.lastReportedAt || 'Never'}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Country:</strong>
                            <span>${threatData.countryCode || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <strong>ISP:</strong>
                            <span>${threatData.isp || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Usage Type:</strong>
                            <span>${threatData.usageType || 'Unknown'}</span>
                        </div>
                    </div>
                    ${threatData.abuseConfidenceScore > 50 ? `
                        <div class="alert-critical mt-3">
                            <i class="fas fa-skull-crosswalk"></i>
                            <strong>HIGH RISK:</strong> This IP has been reported for malicious activity!
                        </div>
                    ` : threatData.abuseConfidenceScore > 0 ? `
                        <div class="alert-warning mt-3">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>CAUTION:</strong> This IP has some abuse reports.
                        </div>
                    ` : `
                        <div class="alert-success mt-3">
                            <i class="fas fa-check-circle"></i>
                            <strong>CLEAN:</strong> No abuse reports found for this IP.
                        </div>
                    `}
                </div>
            `;
            
            await this.logSecurityEvent('ip_threat_check', {
                ip: ip,
                score: threatData.abuseConfidenceScore,
                timestamp: Date.now()
            });
            
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error checking IP: ${error.message}</div>`;
        }
    }

    async checkDNSResolution() {
        const domain = document.getElementById('dns-check-input').value.trim();
        if (!domain) {
            this.showToast('Please enter a domain name', 'warning');
            return;
        }
        
        const resultDiv = document.getElementById('dns-check-result');
        resultDiv.innerHTML = '<div class="loading-spinner">Resolving DNS records...</div>';
        
        try {
            const records = await apiClients.dnsLookup(domain);
            
            resultDiv.innerHTML = `
                <div class="result-card">
                    <h4>DNS Resolution Check: ${domain}</h4>
                    <div class="dns-records">
                        <strong>Resolved IP Addresses:</strong>
                        ${records.length > 0 ? `
                            <ul>
                                ${records.map(ip => `
                                    <li>
                                        <code>${ip}</code>
                                        <button class="check-ip-threat-sm" data-ip="${ip}">
                                            <i class="fas fa-shield-alt"></i> Check Threat
                                        </button>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : '<p>No DNS records found</p>'}
                    </div>
                </div>
            `;
            
            // Add threat check buttons
            document.querySelectorAll('.check-ip-threat-sm').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('threat-ip-input').value = btn.dataset.ip;
                    this.checkIPThreat();
                });
            });
            
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error resolving DNS: ${error.message}</div>`;
        }
    }

    async trackGeoIP() {
        const ip = document.getElementById('geo-ip-input').value.trim();
        if (!ip) {
            this.showToast('Please enter an IP address', 'warning');
            return;
        }
        
        const resultDiv = document.getElementById('geo-track-result');
        resultDiv.innerHTML = '<div class="loading-spinner">Tracking IP location...</div>';
        
        try {
            const geoData = await apiClients.getIPGeolocation(ip);
            
            resultDiv.innerHTML = `
                <div class="result-card">
                    <h4>Geo-IP Tracking: ${ip}</h4>
                    <div class="geo-map" id="geo-map"></div>
                    <div class="geo-details">
                        <div class="detail-row">
                            <strong>Location:</strong>
                            <span>${geoData.city}, ${geoData.region}, ${geoData.country}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Coordinates:</strong>
                            <span>${geoData.location}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Organization:</strong>
                            <span>${geoData.org}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Timezone:</strong>
                            <span>${geoData.timezone || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Create simple map visualization
            const coords = geoData.location.split(',');
            if (coords.length === 2) {
                const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coords[0]},${coords[1]}&zoom=10&size=400x200&markers=color:red|${coords[0]},${coords[1]}&key=YOUR_GOOGLE_MAPS_API_KEY`;
                document.getElementById('geo-map').innerHTML = `<img src="${mapUrl}" alt="Location Map" style="width:100%; border-radius:8px;">`;
            }
            
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error tracking IP: ${error.message}</div>`;
        }
    }

    async logSecurityEvent(type, data) {
        try {
            await db.collection('securityEvents').add({
                type: type,
                ...data,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: firebase.auth().currentUser?.uid
            });
        } catch (error) {
            console.error('Error logging security event:', error);
        }
    }

    getEventIcon(type) {
        const icons = {
            'password_check': 'fa-key',
            'ip_threat_check': 'fa-shield-alt',
            'dns_check': 'fa-globe',
            'geo_track': 'fa-map-marker-alt'
        };
        return icons[type] || 'fa-bell';
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

export const securityInsights = new SecurityInsights();