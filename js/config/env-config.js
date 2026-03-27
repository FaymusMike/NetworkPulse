// js/config/env-config.js
// This file is processed by Netlify - DO NOT ADD TO .gitignore
// Netlify will replace {{VARIABLE_NAME}} with actual values during build

// API Configuration - Injected by Netlify at build time
window.__API_KEYS = {
    OPENROUTER_API_KEY: '{{OPENROUTER_API_KEY}}',
    IPINFO_TOKEN: '{{IPINFO_TOKEN}}',
    VIRUSTOTAL_API_KEY: '{{VIRUSTOTAL_API_KEY}}',
    ABUSEIPDB_API_KEY: '{{ABUSEIPDB_API_KEY}}'
};

// Helper to get API key (with fallback to demo mode)
window.getAPIKey = function(keyName) {
    const key = window.__API_KEYS[keyName];
    // Check if key is a placeholder (starts with {{) or empty
    if (!key || key.startsWith('{{') || key === '') {
        console.warn(`[API] ${keyName} not configured, using demo mode`);
        return null;
    }
    return key;
};

// Check which APIs are configured
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

// Log status on load
window.checkAPIAvailability();