// netlify-build.js
// This script runs during Netlify build to inject environment variables
const fs = require('fs');
const path = require('path');

// Read the template file
const templatePath = path.join(__dirname, 'js/config/env-config.template.js');
const outputPath = path.join(__dirname, 'js/config/env-config.js');

let content = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders with actual environment variables
content = content.replace(/OPENROUTER_API_KEY_PLACEHOLDER/g, process.env.OPENROUTER_API_KEY || '');
content = content.replace(/IPINFO_TOKEN_PLACEHOLDER/g, process.env.IPINFO_TOKEN || '');
content = content.replace(/VIRUSTOTAL_API_KEY_PLACEHOLDER/g, process.env.VIRUSTOTAL_API_KEY || '');
content = content.replace(/ABUSEIPDB_API_KEY_PLACEHOLDER/g, process.env.ABUSEIPDB_API_KEY || '');

// Write the actual config file
fs.writeFileSync(outputPath, content);

console.log('[Build] API keys injected successfully');
console.log('[Build] OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set');
console.log('[Build] IPINFO_TOKEN:', process.env.IPINFO_TOKEN ? '✅ Set' : '❌ Not set');
console.log('[Build] VIRUSTOTAL_API_KEY:', process.env.VIRUSTOTAL_API_KEY ? '✅ Set' : '❌ Not set');
console.log('[Build] ABUSEIPDB_API_KEY:', process.env.ABUSEIPDB_API_KEY ? '✅ Set' : '❌ Not set');