// js/components/security-insights.js - COMPLETE FIXED VERSION
import { apiClients } from '../utils/api-clients.js';
import { db } from '../config/firebase-config.js';
import { authManager } from '../auth/auth.js';

class SecurityInsights {
    constructor() {
        this.isInitialized = false;
        this.setupEventListeners();
    }

    initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.loadSecurityDashboard();
    }

    setupEventListeners() {
        const checkPasswordBtn = document.getElementById('check-password');
        const checkIpThreatBtn = document.getElementById('check-ip-threat');
        const checkDnsBtn = document.getElementById('check-dns');
        const trackGeoIpBtn = document.getElementById('track-geo-ip');
        
        if (checkPasswordBtn) checkPasswordBtn.addEventListener('click', () => this.checkPassword());
        if (checkIpThreatBtn) checkIpThreatBtn.addEventListener('click', () => this.checkIPThreat());
        if (checkDnsBtn) checkDnsBtn.addEventListener('click', () => this.checkDNSResolution());
        if (trackGeoIpBtn) trackGeoIpBtn.addEventListener('click', () => this.trackGeoIP());
        
        const passwordInput = document.getElementById('password-input');
        const threatIpInput = document.getElementById('threat-ip-input');
        const dnsInput = document.getElementById('dns-check-input');
        const geoIpInput = document.getElementById('geo-ip-input');
        
        if (passwordInput) passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.checkPassword(); });
        if (threatIpInput) threatIpInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.checkIPThreat(); });
        if (dnsInput) dnsInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.checkDNSResolution(); });
        if (geoIpInput) geoIpInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.trackGeoIP(); });
    }

    async loadSecurityDashboard() {
        const eventsList = document.getElementById('security-events-list');
        if (!eventsList) return;
        
        try {
            const eventsSnapshot = await db.collection('securityEvents')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
            
            if (eventsSnapshot.empty) {
                eventsList.innerHTML = '<div class="empty-state"><i class="fas fa-shield-alt"></i><p>No security events recorded yet</p></div>';
                return;
            }
            
            eventsList.innerHTML = '';
            eventsSnapshot.forEach(doc => {
                const event = doc.data();
                const eventDiv = document.createElement('div');
                eventDiv.className = `security-event severity-${event.severity || 'low'}`;
                eventDiv.innerHTML = `
                    <div class="event-icon"><i class="fas ${this.getEventIcon(event.type)}"></i></div>
                    <div class="event-details">
                        <strong>${event.title || 'Security Event'}</strong>
                        <p>${event.description || 'No description'}</p>
                        <small>${event.timestamp ? new Date(event.timestamp.toDate()).toLocaleString() : 'Just now'}</small>
                    </div>
                `;
                eventsList.appendChild(eventDiv);
            });
        } catch (error) {
            console.error('[Security] Error loading events:', error);
            eventsList.innerHTML = '<div class="error-message">Failed to load security events</div>';
        }
    }

    async checkPassword() {
        const password = document.getElementById('password-input')?.value;
        if (!password) {
            authManager.showToast('Please enter a password to check', 'warning');
            return;
        }
        
        const resultDiv = document.getElementById('password-result');
        if (!resultDiv) return;
        
        resultDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Checking password security...</div>';
        
        try {
            const strength = this.checkPasswordStrength(password);
            const hash = await this.hashPassword(password);
            const pwnedCount = await apiClients.checkPwnedPassword(hash);
            
            let securityScore = strength.score;
            let recommendations = [...strength.issues];
            
            if (pwnedCount > 0) {
                securityScore = 0;
                recommendations.unshift(`⚠️ This password has been found in ${pwnedCount} data breaches! Do NOT use it.`);
            }
            
            resultDiv.innerHTML = `
                <div class="result-card ${securityScore >= 3 ? 'success' : securityScore > 0 ? 'warning' : 'danger'}">
                    <h4>Password Security Analysis</h4>
                    <div class="security-score">
                        <div class="score-bar"><div class="score-fill" style="width: ${(securityScore / 4) * 100}%"></div></div>
                        <span class="score-value">Strength: ${strength.label}</span>
                    </div>
                    ${pwnedCount > 0 ? `<div class="alert-critical"><i class="fas fa-exclamation-triangle"></i> <strong>BREACH ALERT:</strong> This password has been exposed in ${pwnedCount} data breaches!</div>` : ''}
                    <div class="recommendations"><strong>Recommendations:</strong><ul>${recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul></div>
                </div>
            `;
            
            await this.logSecurityEvent('password_check', { strength: strength.label, pwned: pwnedCount > 0 });
        } catch (error) {
            console.error('[Security] Password check error:', error);
            resultDiv.innerHTML = `<div class="error-message">Error checking password: ${error.message}</div>`;
        }
    }

    checkPasswordStrength(password) {
        let score = 0;
        let issues = [];
        
        if (password.length >= 12) score += 2;
        else if (password.length >= 8) { score += 1; issues.push('Use at least 12 characters for better security'); }
        else issues.push('Password is too short (minimum 8 characters)');
        
        if (/[A-Z]/.test(password)) score += 1; else issues.push('Add uppercase letters');
        if (/[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1; else issues.push('Add numbers');
        if (/[^A-Za-z0-9]/.test(password)) score += 1; else issues.push('Add special characters (!@#$% etc.)');
        
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
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    async checkIPThreat() {
        const ip = document.getElementById('threat-ip-input')?.value;
        if (!ip) { authManager.showToast('Please enter an IP address', 'warning'); return; }
        
        const resultDiv = document.getElementById('ip-threat-result');
        if (!resultDiv) return;
        
        resultDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Checking IP reputation...</div>';
        
        try {
            const threatData = await apiClients.checkIPThreat(ip);
            resultDiv.innerHTML = `
                <div class="result-card ${threatData.abuseConfidenceScore > 50 ? 'danger' : 'success'}">
                    <h4>IP Threat Intelligence Report</h4>
                    <div class="threat-score"><strong>Abuse Confidence Score:</strong><div class="score-bar"><div class="score-fill" style="width: ${threatData.abuseConfidenceScore}%; background: ${threatData.abuseConfidenceScore > 50 ? '#ff4757' : '#00ff9d'}"></div></div><span>${threatData.abuseConfidenceScore}%</span></div>
                    <div class="threat-details">
                        <div class="detail-row"><strong>Total Reports:</strong><span>${threatData.totalReports || 0}</span></div>
                        <div class="detail-row"><strong>Last Reported:</strong><span>${threatData.lastReportedAt || 'Never'}</span></div>
                        <div class="detail-row"><strong>Country:</strong><span>${threatData.countryCode || 'Unknown'}</span></div>
                        <div class="detail-row"><strong>ISP:</strong><span>${threatData.isp || 'Unknown'}</span></div>
                    </div>
                    ${threatData.abuseConfidenceScore > 50 ? '<div class="alert-critical mt-3"><i class="fas fa-skull-crosswalk"></i> <strong>HIGH RISK:</strong> This IP has been reported for malicious activity!</div>' : threatData.abuseConfidenceScore > 0 ? '<div class="alert-warning mt-3"><i class="fas fa-exclamation-triangle"></i> <strong>CAUTION:</strong> This IP has some abuse reports.</div>' : '<div class="alert-success mt-3"><i class="fas fa-check-circle"></i> <strong>CLEAN:</strong> No abuse reports found for this IP.</div>'}
                </div>
            `;
            await this.logSecurityEvent('ip_threat_check', { ip, score: threatData.abuseConfidenceScore });
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error checking IP: ${error.message}</div>`;
        }
    }

    async checkDNSResolution() {
        const domain = document.getElementById('dns-check-input')?.value;
        if (!domain) { authManager.showToast('Please enter a domain name', 'warning'); return; }
        
        const resultDiv = document.getElementById('dns-check-result');
        if (!resultDiv) return;
        
        resultDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Resolving DNS records...</div>';
        
        try {
            const records = await apiClients.dnsLookup(domain);
            resultDiv.innerHTML = `
                <div class="result-card">
                    <h4>DNS Resolution Check: ${domain}</h4>
                    <div class="dns-records">
                        <strong>Resolved IP Addresses:</strong>
                        ${records.length > 0 ? `<ul>${records.map(ip => `<li><code>${ip}</code><button class="check-ip-threat-sm btn-sm btn-outline-primary ms-2" data-ip="${ip}"><i class="fas fa-shield-alt"></i> Check Threat</button></li>`).join('')}</ul>` : '<p>No DNS records found</p>'}
                    </div>
                </div>
            `;
            document.querySelectorAll('.check-ip-threat-sm').forEach(btn => {
                btn.addEventListener('click', () => {
                    const ipInput = document.getElementById('threat-ip-input');
                    if (ipInput) { ipInput.value = btn.dataset.ip; this.checkIPThreat(); }
                });
            });
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error resolving DNS: ${error.message}</div>`;
        }
    }

    async trackGeoIP() {
        const ip = document.getElementById('geo-ip-input')?.value;
        if (!ip) { authManager.showToast('Please enter an IP address', 'warning'); return; }
        
        const resultDiv = document.getElementById('geo-track-result');
        if (!resultDiv) return;
        
        resultDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Tracking IP location...</div>';
        
        try {
            const geoData = await apiClients.getIPGeolocation(ip);
            resultDiv.innerHTML = `
                <div class="result-card">
                    <h4>Geo-IP Tracking: ${ip}</h4>
                    <div class="geo-details">
                        <div class="detail-row"><strong>Location:</strong><span>${geoData.city}, ${geoData.region}, ${geoData.country}</span></div>
                        <div class="detail-row"><strong>Coordinates:</strong><span>${geoData.location}</span></div>
                        <div class="detail-row"><strong>Organization:</strong><span>${geoData.org}</span></div>
                        <div class="detail-row"><strong>Timezone:</strong><span>${geoData.timezone || 'Unknown'}</span></div>
                    </div>
                </div>
            `;
            await this.logSecurityEvent('geo_track', { ip, location: `${geoData.city}, ${geoData.country}` });
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error tracking IP: ${error.message}</div>`;
        }
    }

    async logSecurityEvent(type, data) {
        try {
            await db.collection('securityEvents').add({
                type, ...data,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: firebase.auth().currentUser?.uid
            });
        } catch (error) {
            console.error('[Security] Error logging event:', error);
        }
    }

    getEventIcon(type) {
        const icons = { 'password_check': 'fa-key', 'ip_threat_check': 'fa-shield-alt', 'dns_check': 'fa-globe', 'geo_track': 'fa-map-marker-alt' };
        return icons[type] || 'fa-bell';
    }
}

export const securityInsights = new SecurityInsights();