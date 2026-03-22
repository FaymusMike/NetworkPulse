class APIClients {
    constructor() {
        this.ipInfoToken = 'b6077b96b6253d';
        this.virusTotalKey = 'd430b8804b67e7890ca36e9a0489871b98b61d7f26f9fa71ddbc68dcfd4c99f2';
        this.abuseIPDBKey = '67857ff4bcd660444481b76fcd8326a7aef4502664418fe1ee54a4385986afd7e154f3548272ce72'; // Get from abuseipdb.com (free tier)
    }

    async getIPGeolocation(ip) {
        try {
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
            throw new Error('Failed to fetch IP geolocation data');
        }
    }

    async dnsLookup(domain) {
        try {
            // Using Google DNS API
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
            // Using whois-api.com (free tier)
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
            // Using AbuseIPDB (free tier - requires API key)
            // For demo, return mock data if no API key
            if (!this.abuseIPDBKey || this.abuseIPDBKey === '67857ff4bcd660444481b76fcd8326a7aef4502664418fe1ee54a4385986afd7e154f3548272ce72') {
                return {
                    abuseConfidenceScore: Math.random() * 100,
                    totalReports: Math.floor(Math.random() * 10),
                    lastReportedAt: new Date().toISOString(),
                    countryCode: 'US',
                    isp: 'Mock ISP',
                    usageType: 'Commercial'
                };
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
            throw new Error('Failed to check IP threat level');
        }
    }

    async virusTotalScan(url) {
        try {
            // VirusTotal API v3
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
            
            // Wait for analysis
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Get analysis report
            const reportResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${scanId}`, {
                headers: {
                    'x-apikey': this.virusTotalKey
                }
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
            throw new Error('Failed to scan URL with VirusTotal');
        }
    }
}

export const apiClients = new APIClients();