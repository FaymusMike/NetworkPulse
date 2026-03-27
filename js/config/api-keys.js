// js/config/api-keys.js
// IMPORTANT: This file should be added to .gitignore to prevent committing secrets
// For Netlify: Variables are injected at build time via the Netlify dashboard

// Get API keys from environment variables (injected by Netlify at build time)
// For local development, you can set these in browser console
const getApiKey = (keyName) => {
    // For Netlify: these are replaced at build time
    // You need to add these to your Netlify environment variables
    if (typeof window !== 'undefined' && window._env_ && window._env_[keyName]) {
        return window._env_[keyName];
    }
    
    // For local development: you can set in browser console
    if (window.__ENV && window.__ENV[keyName]) {
        return window.__ENV[keyName];
    }
    
    // Fallback: return null (features will show demo mode)
    return null;
};

// Define your API keys - these will be populated by Netlify at build time
export const API_KEYS = {
    // OpenRouter AI API
    OPENROUTER_API_KEY: '{{OPENROUTER_API_KEY}}',
    
    // IP Geolocation (ipinfo.io)
    IPINFO_TOKEN: '{{IPINFO_TOKEN}}',
    
    // VirusTotal API
    VIRUSTOTAL_API_KEY: '{{VIRUSTOTAL_API_KEY}}',
    
    // AbuseIPDB (for IP threat lookup)
    ABUSEIPDB_API_KEY: '{{ABUSEIPDB_API_KEY}}'
};

// Replace placeholder with actual value if available
const replacePlaceholder = (value) => {
    if (value && value.startsWith('{{') && value.endsWith('}}')) {
        const keyName = value.slice(2, -2);
        return getApiKey(keyName);
    }
    return value;
};

// Process API keys to replace placeholders
export const getAPIKey = (keyName) => {
    const rawValue = API_KEYS[keyName];
    const processedValue = replacePlaceholder(rawValue);
    
    // For Netlify: also check window._env_ if placeholder not replaced
    if (processedValue === rawValue && rawValue && rawValue.startsWith('{{')) {
        if (window._env_ && window._env_[keyName]) {
            return window._env_[keyName];
        }
    }
    
    return processedValue;
};

// Check which APIs are configured
export const isAPIConfigured = {
    openrouter: !!getAPIKey('OPENROUTER_API_KEY') && getAPIKey('OPENROUTER_API_KEY') !== '{{OPENROUTER_API_KEY}}',
    ipinfo: !!getAPIKey('IPINFO_TOKEN') && getAPIKey('IPINFO_TOKEN') !== '{{IPINFO_TOKEN}}',
    virustotal: !!getAPIKey('VIRUSTOTAL_API_KEY') && getAPIKey('VIRUSTOTAL_API_KEY') !== '{{VIRUSTOTAL_API_KEY}}',
    abuseipdb: !!getAPIKey('ABUSEIPDB_API_KEY') && getAPIKey('ABUSEIPDB_API_KEY') !== '{{ABUSEIPDB_API_KEY}}'
};

// Helper to show warning if API key missing
export const checkAPIAvailability = () => {
    const missing = [];
    if (!isAPIConfigured.openrouter) missing.push('OpenRouter AI');
    if (!isAPIConfigured.ipinfo) missing.push('IP Geolocation');
    if (!isAPIConfigured.virustotal) missing.push('VirusTotal');
    if (!isAPIConfigured.abuseipdb) missing.push('AbuseIPDB');
    
    if (missing.length > 0) {
        console.warn(`[API] Missing API keys: ${missing.join(', ')}. Some features will be in demo mode.`);
    }
    
    return missing;
};

// For debugging - log what's configured (remove in production)
console.log('[API] Configuration status:', {
    openrouter: isAPIConfigured.openrouter ? '✅ Configured' : '❌ Missing',
    ipinfo: isAPIConfigured.ipinfo ? '✅ Configured' : '❌ Missing',
    virustotal: isAPIConfigured.virustotal ? '✅ Configured' : '❌ Missing',
    abuseipdb: isAPIConfigured.abuseipdb ? '✅ Configured' : '❌ Missing'
});