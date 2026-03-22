class APIClients {
    constructor() {
        this.ipInfoToken = 'YOUR_IPINFO_TOKEN'; // Get from ipinfo.io
        this.virusTotalKey = 'YOUR_VIRUSTOTAL_KEY'; // Get from virustotal.com
    }

    async getIPGeolocation(ip) {
        try {
            const response = await fetch(`https://ipinfo.io/${ip}/json?token=${this.ipInfoToken}`);
            const data = await response.json();
            return {
                ip: data.ip,
                city: data.city,
                region: data.region,
                country: data.country,
                location: data.loc,
                org: data.org,
                postal: data.postal
            };
        } catch (error) {
            console.error('IP Geolocation error:', error);
            throw error;
        }
    }

    async dnsLookup(domain) {
        try {
            // Using Cloudflare DNS API
            const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
                headers: {
                    'Accept': 'application/dns-json'
                }
            });
            const data = await response.json();
            
            if (data.Answer) {
                return data.Answer.map(ans => ans.data);
            }
            return [];
        } catch (error) {
            console.error('DNS Lookup error:', error);
            throw error;
        }
    }

    async whoisLookup(domain) {
        try {
            // Using whois-api.com (free tier)
            const response = await fetch(`https://whois-api.com/api/v1?domain=${domain}`);
            const data = await response.json();
            return {
                registrar: data.registrar,
                creationDate: data.creation_date,
                expirationDate: data.expiration_date,
                nameServers: data.name_servers,
                registrant: data.registrant
            };
        } catch (error) {
            console.error('WHOIS Lookup error:', error);
            throw error;
        }
    }

    async checkHaveIBeenPwned(email) {
        try {
            const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`, {
                headers: {
                    'hibp-api-key': 'YOUR_HIBP_API_KEY',
                    'User-Agent': 'NetworkPulse-App'
                }
            });
            
            if (response.status === 404) {
                return { breached: false, breaches: [] };
            }
            
            const breaches = await response.json();
            return {
                breached: true,
                breaches: breaches.map(b => ({
                    name: b.Name,
                    domain: b.Domain,
                    breachDate: b.BreachDate,
                    description: b.Description
                }))
            };
        } catch (error) {
            console.error('HIBP error:', error);
            throw error;
        }
    }

    async virusTotalScan(url) {
        try {
            // First, submit URL for scan
            const submitResponse = await fetch('https://www.virustotal.com/api/v3/urls', {
                method: 'POST',
                headers: {
                    'x-apikey': this.virusTotalKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `url=${encodeURIComponent(url)}`
            });
            
            const submitData = await submitResponse.json();
            const scanId = submitData.data.id;
            
            // Wait for analysis
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Get analysis report
            const reportResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${scanId}`, {
                headers: {
                    'x-apikey': this.virusTotalKey
                }
            });
            
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
            throw error;
        }
    }
}

export const apiClients = new APIClients();