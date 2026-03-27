// netlify/functions/inject-env.js
// This file will be run during Netlify build

const fs = require('fs');
const path = require('path');

// Read the api-keys.js file
const apiKeysPath = path.join(__dirname, '../../js/config/api-keys.js');
let content = fs.readFileSync(apiKeysPath, 'utf8');

// Replace placeholders with actual environment variables
content = content.replace(/\{\{OPENROUTER_API_KEY\}\}/g, process.env.OPENROUTER_API_KEY || '');
content = content.replace(/\{\{IPINFO_TOKEN\}\}/g, process.env.IPINFO_TOKEN || '');
content = content.replace(/\{\{VIRUSTOTAL_API_KEY\}\}/g, process.env.VIRUSTOTAL_API_KEY || '');
content = content.replace(/\{\{ABUSEIPDB_API_KEY\}\}/g, process.env.ABUSEIPDB_API_KEY || '');

// Write the updated file
fs.writeFileSync(apiKeysPath, content);

console.log('[Build] API keys injected successfully');