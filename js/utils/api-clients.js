// js/utils/api-clients.js - SECURE VERSION
import { API_KEYS, isAPIConfigured } from '../config/api-keys.js';

class APIClients {
    constructor() {
        // Get API keys from secure config
        this.ipInfoToken = API_KEYS.IPINFO_TOKEN;
        this.virusTotalKey = API_KEYS.VIRUSTOTAL_API_KEY;
        this.abuseIPDBKey = API_KEYS.ABUSEIPDB_API_KEY;
        
        // Track which APIs are available
        this.ipInfoAvailable = isAPIConfigured.ipinfo;
        this.virusTotalAvailable = isAPIConfigured.virustotal;
        this.abuseIPDBAvailable = isAPIConfigured.abuseipdb;
        
        // Log missing APIs
        if (!this.ipInfoAvailable) console.warn('[API] IPInfo token not configured. Geolocation will use demo data.');
        if (!this.virusTotalAvailable) console.warn('[API] VirusTotal key not configured. Scanning will be limited.');
        if (!this.abuseIPDBAvailable) console.warn('[API] AbuseIPDB key not configured. Threat lookup will use demo data.');
    }

    async getIPGeolocation(ip) {
        try {
            // Demo mode when no API key
            if (!this.ipInfoAvailable || !this.ipInfoToken) {
                return this.getDemoGeolocation(ip);
            }
            
            const response = await fetch(`https://ipinfo.io/${ip}/json?token=${this.ipInfoToken}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            return {
                ip: data.ip,
                city: data.city || 'Unknown',
                region: data.region || 'Unknown',
                country: data.country || 'Unknown',
                location: data.loc || '0,0',
                org: data.org || 'Unknown',
                postal: data.postal || 'Unknown',
                timezone: data.timezone || 'Unknown'
            };
        } catch (error) {
            console.error('IP Geolocation error:', error);
            return this.getDemoGeolocation(ip);
        }
    }

    getDemoGeolocation(ip) {
        // Generate realistic demo data based on IP
        const demoLocations = [
            { city: 'New York', region: 'New York', country: 'US', loc: '40.7128,-74.0060', org: 'Digital Ocean' },
            { city: 'London', region: 'England', country: 'GB', loc: '51.5074,-0.1278', org: 'AWS London' },
            { city: 'Singapore', region: 'Singapore', country: 'SG', loc: '1.3521,103.8198', org: 'Google Cloud' },
            { city: 'Tokyo', region: 'Tokyo', country: 'JP', loc: '35.6762,139.6503', org: 'Azure Japan' },
            { city: 'Frankfurt', region: 'Hesse', country: 'DE', loc: '50.1109,8.6821', org: 'AWS Europe' }
        ];
        
        const demo = demoLocations[Math.floor(Math.random() * demoLocations.length)];
        return {
            ip: ip,
            city: demo.city,
            region: demo.region,
            country: demo.country,
            location: demo.loc,
            org: demo.org,
            postal: 'N/A',
            timezone: 'UTC'
        };
    }

    async dnsLookup(domain) {
        try {
            const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            if (data.Answer) {
                return data.Answer.filter(ans => ans.type === 1).map(ans => ans.data);
            }
            return [];
        } catch (error) {
            console.error('DNS Lookup error:', error);
            throw new Error('Failed to resolve DNS records');
        }
    }

    async whoisLookup(domain) {
        try {
            const response = await fetch(`https://whois-api.com/api/v1?domain=${encodeURIComponent(domain)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            return {
                registrar: data.registrar || 'N/A',
                creationDate: data.creation_date || 'N/A',
                expirationDate: data.expiration_date || 'N/A',
                nameServers: data.name_servers || [],
                registrant: data.registrant || 'N/A'
            };
        } catch (error) {
            console.error('WHOIS Lookup error:', error);
            throw new Error('Failed to fetch WHOIS information');
        }
    }

    async checkPwnedPassword(hash) {
        try {
            const prefix = hash.substring(0, 5);
            const suffix = hash.substring(5);
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            
            const lines = text.split('\n');
            for (const line of lines) {
                const [hashSuffix, count] = line.split(':');
                if (hashSuffix === suffix) {
                    return parseInt(count);
                }
            }
            return 0;
        } catch (error) {
            console.error('Pwned Passwords error:', error);
            return 0;
        }
    }

    async checkIPThreat(ip) {
        try {
            // Demo mode when no API key
            if (!this.abuseIPDBAvailable || !this.abuseIPDBKey) {
                return this.getDemoThreatData(ip);
            }
            
            const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
                headers: {
                    'Key': this.abuseIPDBKey,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            return {
                abuseConfidenceScore: data.data.abuseConfidenceScore,
                totalReports: data.data.totalReports,
                lastReportedAt: data.data.lastReportedAt,
                countryCode: data.data.countryCode,
                isp: data.data.isp,
                usageType: data.data.usageType
            };
        } catch (error) {
            console.error('IP Threat Check error:', error);
            return this.getDemoThreatData(ip);
        }
    }

    getDemoThreatData(ip) {
        // Generate realistic demo threat data
        const randomScore = Math.random() * 30; // 0-30% for demo
        return {
            abuseConfidenceScore: randomScore,
            totalReports: Math.floor(randomScore / 10),
            lastReportedAt: randomScore > 10 ? new Date().toISOString() : null,
            countryCode: 'US',
            isp: 'Demo ISP',
            usageType: 'Commercial'
        };
    }

    async virusTotalScan(url) {
        try {
            if (!this.virusTotalAvailable || !this.virusTotalKey) {
                return this.getDemoVirusTotalResult(url);
            }
            
            const response = await fetch('https://www.virustotal.com/api/v3/urls', {
                method: 'POST',
                headers: {
                    'x-apikey': this.virusTotalKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `url=${encodeURIComponent(url)}`
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const submitData = await response.json();
            const scanId = submitData.data.id;
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const reportResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${scanId}`, {
                headers: { 'x-apikey': this.virusTotalKey }
            });
            
            if (!reportResponse.ok) throw new Error(`HTTP ${reportResponse.status}`);
            const reportData = await reportResponse.json();
            const stats = reportData.data.attributes.stats;
            
            return {
                malicious: stats.malicious,
                suspicious: stats.suspicious,
                harmless: stats.harmless,
                undetected: stats.undetected,
                total: stats.malicious + stats.suspicious + stats.harmless + stats.undetected
            };
        } catch (error) {
            console.error('VirusTotal error:', error);
            return this.getDemoVirusTotalResult(url);
        }
    }

    getDemoVirusTotalResult(url) {
        return {
            malicious: 0,
            suspicious: Math.random() > 0.9 ? 1 : 0,
            harmless: 85,
            undetected: 15,
            total: 100
        };
    }
}

export const apiClients = new APIClients();