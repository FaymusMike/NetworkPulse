import { apiClients } from '../utils/api-clients.js';

class NetworkIntel {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // IP Geolocation
        document.getElementById('lookup-ip')?.addEventListener('click', () => this.lookupIP());
        document.getElementById('ip-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.lookupIP();
        });
        
        // DNS Lookup
        document.getElementById('lookup-dns')?.addEventListener('click', () => this.lookupDNS());
        document.getElementById('domain-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.lookupDNS();
        });
        
        // WHOIS Lookup
        document.getElementById('lookup-whois')?.addEventListener('click', () => this.lookupWHOIS());
        document.getElementById('whois-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.lookupWHOIS();
        });
    }

    async lookupIP() {
        const ip = document.getElementById('ip-input').value.trim();
        if (!ip) {
            this.showError('geo-result', 'Please enter an IP address');
            return;
        }
        
        const resultDiv = document.getElementById('geo-result');
        resultDiv.innerHTML = '<div class="loading-spinner">Loading...</div>';
        
        try {
            const data = await apiClients.getIPGeolocation(ip);
            resultDiv.innerHTML = `
                <div class="result-card">
                    <h4>IP Geolocation Results</h4>
                    <div class="result-grid">
                        <div class="result-item">
                            <strong>IP Address:</strong>
                            <span>${data.ip}</span>
                        </div>
                        <div class="result-item">
                            <strong>Location:</strong>
                            <span>${data.city}, ${data.region}, ${data.country}</span>
                        </div>
                        <div class="result-item">
                            <strong>Coordinates:</strong>
                            <span>${data.location}</span>
                        </div>
                        <div class="result-item">
                            <strong>Organization:</strong>
                            <span>${data.org}</span>
                        </div>
                        <div class="result-item">
                            <strong>Postal Code:</strong>
                            <span>${data.postal || 'N/A'}</span>
                        </div>
                        <div class="result-item">
                            <strong>Timezone:</strong>
                            <span>${data.timezone || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        }
    }

    async lookupDNS() {
        const domain = document.getElementById('domain-input').value.trim();
        if (!domain) {
            this.showError('dns-result', 'Please enter a domain name');
            return;
        }
        
        const resultDiv = document.getElementById('dns-result');
        resultDiv.innerHTML = '<div class="loading-spinner">Loading...</div>';
        
        try {
            const records = await apiClients.dnsLookup(domain);
            if (records.length === 0) {
                resultDiv.innerHTML = '<div class="info-message">No DNS records found</div>';
                return;
            }
            
            resultDiv.innerHTML = `
                <div class="result-card">
                    <h4>DNS Lookup Results for ${domain}</h4>
                    <div class="dns-records">
                        <strong>A Records (IPv4):</strong>
                        <ul>
                            ${records.map(record => `<li><code>${record}</code></li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        }
    }

    async lookupWHOIS() {
        const domain = document.getElementById('whois-input').value.trim();
        if (!domain) {
            this.showError('whois-result', 'Please enter a domain or IP');
            return;
        }
        
        const resultDiv = document.getElementById('whois-result');
        resultDiv.innerHTML = '<div class="loading-spinner">Loading...</div>';
        
        try {
            const info = await apiClients.whoisLookup(domain);
            resultDiv.innerHTML = `
                <div class="result-card">
                    <h4>WHOIS Information for ${domain}</h4>
                    <div class="result-grid">
                        <div class="result-item">
                            <strong>Registrar:</strong>
                            <span>${info.registrar || 'N/A'}</span>
                        </div>
                        <div class="result-item">
                            <strong>Creation Date:</strong>
                            <span>${info.creationDate || 'N/A'}</span>
                        </div>
                        <div class="result-item">
                            <strong>Expiration Date:</strong>
                            <span>${info.expirationDate || 'N/A'}</span>
                        </div>
                        <div class="result-item">
                            <strong>Name Servers:</strong>
                            <span>${info.nameServers ? info.nameServers.join(', ') : 'N/A'}</span>
                        </div>
                        ${info.registrant ? `
                        <div class="result-item">
                            <strong>Registrant:</strong>
                            <span>${info.registrant}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            resultDiv.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }
}

export const networkIntel = new NetworkIntel();