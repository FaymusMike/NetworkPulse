// js/config/env-config.template.js
// This is a template file - DO NOT use directly
// During build, Netlify will replace the placeholders with actual values

// API Configuration - These will be replaced during build
window.__API_KEYS = {
    OPENROUTER_API_KEY: 'OPENROUTER_API_KEY_PLACEHOLDER',
    IPINFO_TOKEN: 'IPINFO_TOKEN_PLACEHOLDER',
    VIRUSTOTAL_API_KEY: 'VIRUSTOTAL_API_KEY_PLACEHOLDER',
    ABUSEIPDB_API_KEY: 'ABUSEIPDB_API_KEY_PLACEHOLDER'
};

window.getAPIKey = function(keyName) {
    const key = window.__API_KEYS[keyName];
    if (!key || key.includes('PLACEHOLDER') || key === '') {
        console.warn(`[API] ${keyName} not configured, using demo mode`);
        return null;
    }
    return key;
};

window.checkAPIAvailability = function() {
    const status = {
        openrouter: !!window.getAPIKey('OPENROUTER_API_KEY'),
        ipinfo: !!window.getAPIKey('IPINFO_TOKEN'),
        virustotal: !!window.getAPIKey('VIRUSTOTAL_API_KEY'),
        abuseipdb: !!window.getAPIKey('ABUSEIPDB_API_KEY')
    };
    console.log('[API] Status:', status);
    return status;
};

window.checkAPIAvailability();